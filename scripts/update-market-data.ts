import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

// Relative imports for data
import { INITIAL_CURATED_LISTINGS } from '../src/data/initialMemoryData.js';
import { MARKET_TRENDS_DATA } from '../src/data/marketTrendsData.js';
import { EBAY_SOLD_RECORDS } from '../src/data/ebaySoldData.js';
import { CURRENT_RESEARCH_METADATA } from '../src/data/researchMetadata.js';

dotenv.config();

const CURATED_DATA_FILE = path.join(process.cwd(), 'public', 'curated-data.json');
const EBAY_DATA_FILE = path.join(process.cwd(), 'public', 'ebay-data.json');
const DATA_FILE = path.join(process.cwd(), 'public', 'market-data.json');
const EBAY_LOG_FILE = path.join(process.cwd(), 'public', 'ebay-sync.log');

function logSyncMessage(msg: string) {
  const timestamp = new Date().toISOString();
  const formattedMsg = `[${timestamp}] ${msg}\n`;
  console.log(`[eBay Sync Log] ${msg}`);
  try {
    fs.appendFileSync(EBAY_LOG_FILE, formattedMsg, 'utf-8');
  } catch (err) {
    console.warn('[eBay Sync Log] Could not append to ebay-sync.log:', err);
  }
}

// Get AI client if available
function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

// Get eBay Token with robust parameter handling and diagnostics
async function getEbayToken(appId: string, certId: string): Promise<string | null> {
  const cleanAppId = appId.trim();
  const cleanCertId = certId.trim();
  
  if (!cleanAppId || !cleanCertId) {
    console.warn('[eBay API] Missing App ID or Cert ID');
    return null;
  }

  try {
    const credentials = Buffer.from(`${cleanAppId}:${cleanCertId}`).toString('base64');
    const bodyParams = new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'https://api.ebay.com/oauth/api_scope'
    });

    const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: bodyParams.toString()
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.warn(`[eBay API] Failed to get OAuth token (HTTP ${response.status} ${response.statusText}):`, errorBody);
      return null;
    }
    
    const data = await response.json();
    return data.access_token || null;
  } catch (error: any) {
    console.warn('[eBay API] Network exception fetching OAuth token:', error.message || error);
    return null;
  }
}

// Extract genuine memory rank (e.g. 1Rx4, 2Rx4, 2Rx8, 4Rx4, 8Rx4) from title without confusing with lot counts
function extractMemoryRank(title: string, capacityGB: number, generation: string): string {
  if (!title) return '2Rx4';
  const rankMatch = title.match(/\b([1248]R\s*[x*]\s*(?:4|8|16))\b/i);
  if (rankMatch) {
    return rankMatch[1].replace(/\s+/g, '').replace('*', 'x').toUpperCase();
  }
  if (/\bquad\s*rank\b/i.test(title)) return '4Rx4';
  if (/\bdual\s*rank\b/i.test(title)) return '2Rx4';
  if (/\bsingle\s*rank\b/i.test(title)) return '1Rx4';
  if (/\boctal\s*rank\b/i.test(title)) return '8Rx4';
  
  const simpleRMatch = title.match(/\b([1248]R)\b/i);
  if (simpleRMatch) return simpleRMatch[1].toUpperCase();

  // Standard architectural defaults by density & generation
  if (capacityGB >= 128 && generation === 'DDR4') return '4Rx4';
  if (capacityGB >= 128 && generation === 'DDR5') return '4Rx4';
  if (capacityGB <= 16 && generation === 'DDR4') return '1Rx4';
  return '2Rx4';
}

// Extract true single module capacity, genuine lot quantity, and accurate unit price
// CRITICAL DOMAIN LOGIC: In kit phrasing like "64GB 2 x 32GB" or "(4x16GB)", the single module capacity is 32GB / 16GB, NOT the kit total!
function parseListingCapacityAndLot(title: string, rawPrice: number, fallbackCap: number): { capacityGB: number; lotQuantity: number; unitPrice: number } {
  if (!title || rawPrice <= 0) return { capacityGB: fallbackCap, lotQuantity: 1, unitPrice: rawPrice };
  
  const t = title.toLowerCase();

  // Clean out common rank, bus width, timing, and inventory strings so they cannot trigger lot regexes
  const cleanT = t
    .replace(/\b[1248]r\s*[x*]\s*(?:4|8|16)\b/gi, ' ') // 2Rx4, 1Rx8, 2Rx8, 4Rx4, 8Rx4
    .replace(/\b[1248]r\b/gi, ' ') // 1R, 2R, 4R, 8R
    .replace(/\b(?:\d+g|\d+m)\s*x\s*(?:72|4|8|16)\b/gi, ' ') // 2Gx72, 4Gx72, 2Gx4, 4Gx4, 1Gx8
    .replace(/\b(?:qty|quantity)\s*(?:available|in\s*stock|on\s*hand|avail)\b/gi, ' ') // "Qty Available"
    .replace(/\b(?:multiple|more\s+than)\s+qty\b/gi, ' ')
    .replace(/\bpc[345][l]?-\d+[ru]?\b/gi, ' '); // PC4-21300R, etc.

  let lotQty = 1;
  let singleCap = fallbackCap;

  // 1. Explicit multi-module capacity pattern: "2x16GB", "2 x 32GB", "4x16GB", "8x8GB", "24x16GB", "4x4GB", "2x64GB"
  // Handles "(2x16GB)", "2 x 32GB", "4X16GB", "8 x 16GB", "2x 32GB = 64GB"
  const multiCapMatch = cleanT.match(/\b(\d+)\s*x\s*(\d+)\s*(?:gb|g)\b/i);
  if (multiCapMatch) {
    const q = parseInt(multiCapMatch[1], 10);
    const c = parseInt(multiCapMatch[2], 10);
    if (q === 1 && c > 0) {
      singleCap = c;
    } else if (q > 1 && q <= 500 && [4, 8, 16, 24, 32, 48, 64, 96, 128, 256].includes(c)) {
      lotQty = q;
      singleCap = c;
    }
  }

  // 2. Leading brand multiplier, e.g. "12x Micron 96GB(1x96GB)" or "19x Mixed SK Hynix 16GB"
  if (lotQty === 1) {
    const leadingBrandXMatch = cleanT.match(/\b(\d+)\s*x\s+(?:samsung|sk\s*hynix|hynix|micron|kingston|dell|hp|hpe|lenovo|mixed|cisco|ecc|rdimm|server)\b/i);
    if (leadingBrandXMatch) {
      const q = parseInt(leadingBrandXMatch[1], 10);
      if (q > 1 && q <= 500) {
        lotQty = q;
        const capAfterBrand = cleanT.match(/\b(\d+)\s*x\s+[a-z0-9\s-]+?\s+(\d+)\s*(?:gb|g)\b/i);
        if (capAfterBrand && [4, 8, 16, 24, 32, 48, 64, 96, 128, 256].includes(parseInt(capAfterBrand[2], 10))) {
          singleCap = parseInt(capAfterBrand[2], 10);
        }
      }
    }
  }

  // 3. Explicit Lot Phrasing: "lot of X", "lot: X", "lot #X", "bulk lot of X", "[ LOT OF 10 ]"
  if (lotQty === 1) {
    const lotOfMatch = cleanT.match(/\b(?:bulk\s+)?lot\s*(?:of)?\s*[:#]?\s*\(?(\d+)\)?\b/i);
    if (lotOfMatch) {
      const val = parseInt(lotOfMatch[1], 10);
      if (val > 1 && val <= 500) {
        lotQty = val;
        const capMatch = cleanT.match(/\b(\d+)\s*(?:gb|g)\b/i);
        if (capMatch && [4, 8, 16, 24, 32, 48, 64, 96, 128, 256].includes(parseInt(capMatch[1], 10))) {
          singleCap = parseInt(capMatch[1], 10);
        }
      }
    }
  }

  // 4. Pack Phrasing: "X pack", "X-pack", "X pk", "pack of X"
  if (lotQty === 1) {
    const packMatch = cleanT.match(/\b(?:pack\s*of\s*(\d+)|(\d+)\s*[- ]?(?:pack|pk))\b/i);
    if (packMatch) {
      const val = parseInt(packMatch[1] || packMatch[2], 10);
      if (val > 1 && val <= 500) {
        lotQty = val;
        const capMatch = cleanT.match(/\b(\d+)\s*(?:gb|g)\b/i);
        if (capMatch && [4, 8, 16, 24, 32, 48, 64, 96, 128, 256].includes(parseInt(capMatch[1], 10))) {
          singleCap = parseInt(capMatch[1], 10);
        }
      }
    }
  }

  // 5. Kit & Pair Phrasing: "matched pair", "pair of 2", "kit of X"
  if (lotQty === 1) {
    if (/\b(?:matched\s+pair|pair\s+of\s+2|pair)\b/i.test(cleanT)) {
      lotQty = 2;
      const capMatch = cleanT.match(/\b(\d+)\s*(?:gb|g)\b/i);
      if (capMatch && [4, 8, 16, 24, 32, 48, 64, 96, 128, 256].includes(parseInt(capMatch[1], 10))) {
        singleCap = parseInt(capMatch[1], 10);
      }
    } else {
      const kitMatch = cleanT.match(/\bkit\s*of\s*(\d+)\b/i);
      if (kitMatch) {
        const val = parseInt(kitMatch[1], 10);
        if (val > 1 && val <= 500) {
          lotQty = val;
          const capMatch = cleanT.match(/\b(\d+)\s*(?:gb|g)\b/i);
          if (capMatch && [4, 8, 16, 24, 32, 48, 64, 96, 128, 256].includes(parseInt(capMatch[1], 10))) {
            singleCap = parseInt(capMatch[1], 10);
          }
        }
      }
    }
  }

  // 6. Explicit module counts: "X sticks", "X modules", "X dimms", "X pcs", "X pieces", "in 24 Samsung"
  if (lotQty === 1) {
    const sticksMatch = cleanT.match(/\b(\d+)\s*(?:sticks|modules|dimms|pcs|pieces)\b/i);
    if (sticksMatch) {
      const val = parseInt(sticksMatch[1], 10);
      if (val > 1 && val <= 500) {
        lotQty = val;
        const capMatch = cleanT.match(/\b(\d+)\s*(?:gb|g)\b/i);
        if (capMatch && [4, 8, 16, 24, 32, 48, 64, 96, 128, 256].includes(parseInt(capMatch[1], 10))) {
          singleCap = parseInt(capMatch[1], 10);
        }
      }
    } else {
      const inXMatch = cleanT.match(/\bin\s+(\d+)\s+(?:samsung|sk\s*hynix|hynix|micron|kingston|dell|hp|hpe|lenovo)\b/i);
      if (inXMatch) {
        const val = parseInt(inXMatch[1], 10);
        if (val > 1 && val <= 500) {
          lotQty = val;
          const capMatch = cleanT.match(/\b(\d+)\s*(?:gb|g)\b/i);
          if (capMatch && [4, 8, 16, 24, 32, 48, 64, 96, 128, 256].includes(parseInt(capMatch[1], 10))) {
            singleCap = parseInt(capMatch[1], 10);
          }
        }
      }
    }
  }

  // If still single module and no multiCapMatch, verify single capacity in title
  if (lotQty === 1 && !multiCapMatch) {
    const singleCapMatch = cleanT.match(/\b(\d+)\s*(?:gb|g)\b/i);
    if (singleCapMatch) {
      const c = parseInt(singleCapMatch[1], 10);
      if ([4, 8, 16, 24, 32, 48, 64, 96, 128, 256].includes(c)) {
        singleCap = c;
      }
    }
  }

  const unitPrice = Number((rawPrice / lotQty).toFixed(2));
  return { capacityGB: singleCap, lotQuantity: lotQty, unitPrice };
}

function buildSpeedStandard(gen: string, speed: number): string {
  if (gen === 'DDR3') {
    return speed === 1333 ? 'PC3-10600R' : speed === 1600 ? 'PC3-12800R' : 'PC3-14900R';
  }
  if (gen === 'DDR4') {
    if (speed === 2133) return 'PC4-17000R';
    if (speed === 2400) return 'PC4-19200R';
    if (speed === 2666) return 'PC4-21300R';
    if (speed === 2933) return 'PC4-23400R';
    return 'PC4-25600R';
  }
  // DDR5
  if (speed === 4800) return 'PC5-38400R';
  if (speed === 5600) return 'PC5-44800R';
  if (speed === 6400) return 'PC5-51200R';
  return 'PC5-57600R';
}

function detectBrand(title: string): 'Samsung' | 'SK Hynix' | 'Micron' | 'Kingston' | 'Dell OEM' | 'HPE OEM' | 'Lenovo OEM' | 'Generic/Mixed' {
  const t = title.toLowerCase();
  if (t.includes('samsung')) return 'Samsung';
  if (t.includes('hynix')) return 'SK Hynix';
  if (t.includes('micron')) return 'Micron';
  if (t.includes('kingston')) return 'Kingston';
  if (t.includes('dell')) return 'Dell OEM';
  if (t.includes('hpe') || t.includes('hp ')) return 'HPE OEM';
  if (t.includes('lenovo')) return 'Lenovo OEM';
  return 'Generic/Mixed';
}

function extractPartNumber(title: string): string {
  const match = title.match(/\b(M393[A-Z0-9]+|M386[A-Z0-9]+|M392[A-Z0-9]+|HMA[A-Z0-9]+|HMT[A-Z0-9]+|MTA[A-Z0-9]+|MT36[A-Z0-9]+|KSM[A-Z0-9]+|KVR[A-Z0-9]+)\b/i);
  return match ? match[1].toUpperCase() : '';
}

// Search eBay Prices with strict per-unit normalization
async function searchEbayPrices(token: string, trend: any) {
  const q = encodeURIComponent(`${trend.capacityGB}GB ${trend.generation} ${trend.speedMTs} ECC RDIMM`);
  const filter = encodeURIComponent('conditionIds:{3000|2000|2500}');
  
  // Try with condition filter first
  let url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${q}&filter=${filter}&limit=10`;
  let response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
    }
  });

  // Fallback to query without condition filter if needed
  if (!response.ok) {
    url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${q}&limit=10`;
    response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
      }
    });
  }
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`eBay API HTTP ${response.status}: ${errText.slice(0, 100)}`);
  }
  
  const data = await response.json();
  if (data.itemSummaries && data.itemSummaries.length > 0) {
    const refPrice = trend.singleUnitRetailPrice || trend.currentAvgPrice || trend.avgPrice1MoAgo || 20;

    const skuItems: any[] = [];
    const unitPrices: number[] = [];

    data.itemSummaries.forEach((item: any, idx: number) => {
      const raw = parseFloat(item.price?.value || '0');
      const title = item.title || '';
      if (raw <= 0) return;
      const normalized = parseListingCapacityAndLot(title, raw, trend.capacityGB);
      if (normalized.unitPrice <= 0) return;

      unitPrices.push(normalized.unitPrice);

      const sellerName = item.seller?.username || 'eBay Seller';
      const feedback = item.seller?.feedbackPercentage ? `${item.seller.feedbackPercentage}% positive` : '';
      const cleanId = item.itemId ? String(item.itemId).replace(/[^a-zA-Z0-9]/g, '').slice(-12) : Math.random().toString(36).substring(2, 8);
      const cond = item.condition || 'Used (Tested)';
      const conditionMapped = cond.toLowerCase().includes('refurb') ? 'Refurbished' :
        cond.toLowerCase().includes('open') ? 'Open Box' :
        cond.toLowerCase().includes('new') ? 'New Surplus' : 'Used (Tested)';

      skuItems.push({
        id: `ebay-${trend.generation.toLowerCase()}-${normalized.capacityGB}-${trend.speedMTs}-${cleanId}-${idx}`,
        generation: trend.generation,
        capacityGB: normalized.capacityGB,
        speedMTs: trend.speedMTs,
        speedStandard: buildSpeedStandard(trend.generation, trend.speedMTs),
        moduleType: (normalized.capacityGB >= 128 && trend.generation === 'DDR4') ? 'LRDIMM' : (trend.generation === 'DDR5' && normalized.capacityGB >= 128) ? '3DS RDIMM' : 'RDIMM',
        rank: extractMemoryRank(title, normalized.capacityGB, trend.generation),
        voltage: trend.generation === 'DDR5' ? '1.1V' : trend.generation === 'DDR4' ? '1.2V' : '1.5V',
        vendor: `eBay (${sellerName})`,
        vendorType: 'Marketplace',
        title: title,
        partNumber: extractPartNumber(title),
        brand: detectBrand(title),
        pricePerUnit: normalized.unitPrice,
        totalLotPrice: raw,
        lotQuantity: normalized.lotQuantity,
        currency: item.price?.currency || 'USD',
        condition: conditionMapped,
        testedWorking: true,
        warranty: conditionMapped === 'Refurbished' ? '30-Day Seller Warranty' : 'eBay Money Back Guarantee',
        sourceUrl: item.itemWebUrl || `https://www.ebay.com/itm/${item.itemId}`,
        sourceDomain: 'ebay.com',
        scrapedAt: new Date().toISOString(),
        notes: feedback ? `eBay Seller: ${sellerName} (${feedback})` : `eBay Seller: ${sellerName}`,
        stockStatus: 'In Stock'
      });
    });
      
    if (unitPrices.length > 0) {
      unitPrices.sort((a: number, b: number) => a - b);
      const lowest = unitPrices[0];
      const highest = unitPrices[unitPrices.length - 1];
      const avg = unitPrices.reduce((a: number, b: number) => a + b, 0) / unitPrices.length;
      
      return {
        lowestAskingCurrent: Number(lowest.toFixed(2)),
        highestAskingCurrent: Number(highest.toFixed(2)),
        currentAvgPrice: Number(avg.toFixed(2)),
        items: skuItems
      };
    }
  }
  return null;
}

// Format current time into human-friendly strings in UTC+8 (Hong Kong Time)
function getFormattedTimeMetadata() {
  const now = new Date();
  
  // Format accurately in Asia/Hong_Kong (UTC+8) timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Hong_Kong',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';

  const dayName = getPart('weekday');
  const monthName = getPart('month');
  const dateNum = getPart('day');
  const year = getPart('year');
  const hour = getPart('hour');
  const minute = getPart('minute');
  const dayPeriod = getPart('dayPeriod'); // AM or PM

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthIndex = monthNames.indexOf(monthName);
  const quarter = monthIndex !== -1 ? Math.floor(monthIndex / 3) + 1 : 3;

  const lastUpdatedDate = `${monthName} ${dateNum}, ${year}`;
  const lastUpdatedDay = dayName;
  const lastUpdatedTime = `${hour}:${minute} ${dayPeriod}`;
  const timezone = 'UTC+8 (Hong Kong Time)';
  const formattedFullTimestamp = `${dayName}, ${monthName} ${dateNum}, ${year} at ${hour}:${minute} ${dayPeriod} (UTC+8)`;
  
  return {
    lastUpdatedDate,
    lastUpdatedDay,
    lastUpdatedTime,
    timezone,
    formattedFullTimestamp,
    researchQuarter: `Q${quarter} ${year}`,
  };
}

async function updateMarketData() {
  console.log('[GitHub Actions] Starting daily market data update...');
  
  let serverListings = [...INITIAL_CURATED_LISTINGS];
  let serverTrends = [...MARKET_TRENDS_DATA];
  let serverEbaySold = [...EBAY_SOLD_RECORDS];
  let serverMetadata = { ...CURRENT_RESEARCH_METADATA };
  let cronLogs: any[] = [];
  let historicalSnapshots: any[] = [];
  let curatedSnapshots: any[] = [];
  
  // Try to load existing data so we don't lose logs or previous state
  try {
    const curatedExists = fs.existsSync(CURATED_DATA_FILE);
    const ebayExists = fs.existsSync(EBAY_DATA_FILE);
    const oldExists = fs.existsSync(DATA_FILE);
    
    let curatedParsed: any = null;
    let ebayParsed: any = null;

    if (curatedExists && ebayExists) {
      curatedParsed = JSON.parse(fs.readFileSync(CURATED_DATA_FILE, 'utf-8'));
      ebayParsed = JSON.parse(fs.readFileSync(EBAY_DATA_FILE, 'utf-8'));
    } else if (oldExists) {
      curatedParsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      ebayParsed = curatedParsed; // fallback for initial migration
    }

    if (curatedParsed && Array.isArray(curatedParsed.curatedListings)) {
      serverListings = curatedParsed.curatedListings;
      serverMetadata = curatedParsed.metadata || serverMetadata;
      if (Array.isArray(curatedParsed.dailySnapshots)) {
        curatedSnapshots = curatedParsed.dailySnapshots;
      }
    }

    const trendsSource = (ebayParsed && ebayParsed.trends) ? ebayParsed : (curatedParsed && curatedParsed.trends) ? curatedParsed : null;
    if (trendsSource && trendsSource.trends) {
      serverTrends = trendsSource.trends.map((t: any) => {
        const initT = MARKET_TRENDS_DATA.find(it => it.generation === t.generation && it.capacityGB === t.capacityGB && it.speedMTs === t.speedMTs);
        return {
          ...t,
          avgPrice1WeekAgo: t.avgPrice1WeekAgo !== undefined && t.avgPrice1WeekAgo !== null ? t.avgPrice1WeekAgo : (initT?.avgPrice1WeekAgo || t.currentAvgPrice),
          avgPrice3MoAgo: t.avgPrice3MoAgo !== undefined && t.avgPrice3MoAgo !== null ? t.avgPrice3MoAgo : (initT?.avgPrice3MoAgo || t.currentAvgPrice),
        };
      });
      serverEbaySold = trendsSource.ebaySold || serverEbaySold;
      cronLogs = trendsSource.cronInfo?.recentLogs || [];
      historicalSnapshots = trendsSource.historicalSnapshots || [];
    }
  } catch (e) {
    console.warn('[GitHub Actions] No existing data file found, using defaults.');
  }

  const timeMeta = getFormattedTimeMetadata();

  serverMetadata = {
    ...serverMetadata,
    lastUpdatedDate: timeMeta.lastUpdatedDate,
    lastUpdatedDay: timeMeta.lastUpdatedDay,
    lastUpdatedTime: timeMeta.lastUpdatedTime,
    timezone: timeMeta.timezone,
    formattedFullTimestamp: timeMeta.formattedFullTimestamp,
    researchQuarter: timeMeta.researchQuarter,
    totalSkusAudited: serverTrends.length,
  };

  const ebayAppId = (
    process.env.EBAY_APP_ID ||
    process.env.EBAY_CLIENT_ID ||
    process.env.EBAY_APPID ||
    process.env.EBAY_CLIENTID ||
    process.env.EBAY_KEY ||
    ''
  ).trim();

  const ebayCertId = (
    process.env.EBAY_CERT_ID ||
    process.env.EBAY_CLIENT_SECRET ||
    process.env.EBAY_CERTID ||
    process.env.EBAY_SECRET ||
    process.env.EBAY_CERT ||
    ''
  ).trim();

  const ai = getGenAIClient();
  
  console.log(`[GitHub Actions Diagnostics] Environment variables check:
  - EBAY_APP_ID: ${ebayAppId ? `FOUND (length: ${ebayAppId.length}, starts with: ${ebayAppId.slice(0, 4)}...)` : 'NOT SET / EMPTY'}
  - EBAY_CERT_ID: ${ebayCertId ? `FOUND (length: ${ebayCertId.length}, starts with: ${ebayCertId.slice(0, 4)}...)` : 'NOT SET / EMPTY'}
  - GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? `FOUND (length: ${process.env.GEMINI_API_KEY.length})` : 'NOT SET / EMPTY'}`);
  
  let liveMarketNotes = '';
  let usedEbay = false;
  let skuSuccessCount = 0;
  let skuFailCount = 0;
  let allLiveEbayListings: any[] = [];

  logSyncMessage(`=== SYNC STARTED: Querying secondary server memory market data (${serverTrends.length} SKUs) ===`);

  // 1. Try eBay API First
  if (ebayAppId && ebayCertId) {
    console.log(`[GitHub Actions] eBay Production Credentials found. Connecting to Real eBay API...`);
    const token = await getEbayToken(ebayAppId, ebayCertId);
    
    if (token) {
      usedEbay = true;
      liveMarketNotes = "Live market data sourced directly from real-time eBay Browse API (Production).";
      console.log('[GitHub Actions] Successfully authenticated with eBay API.');
      logSyncMessage(`Authenticated with eBay Production API. Processing ${serverTrends.length} SKUs...`);
      
      for (let i = 0; i < serverTrends.length; i++) {
        const trend = serverTrends[i];
        const skuLabel = `${trend.generation} ${trend.capacityGB}GB ${trend.speedMTs}MT/s ECC RDIMM`;
        console.log(`[GitHub Actions] Checking SKU ${i + 1}/${serverTrends.length} via eBay: ${skuLabel}...`);
        
        try {
          const prices = await searchEbayPrices(token, trend);
          if (prices) {
            trend.currentAvgPrice = prices.currentAvgPrice;
            trend.lowestAskingCurrent = prices.lowestAskingCurrent;
            trend.highestAskingCurrent = prices.highestAskingCurrent;
            if (prices.items && prices.items.length > 0) {
              allLiveEbayListings.push(...prices.items);
            }
            skuSuccessCount++;
            logSyncMessage(`[SKU ${i + 1}/${serverTrends.length}] ${skuLabel} - Status: SUCCESS - Avg: $${prices.currentAvgPrice.toFixed(2)} (Range: $${prices.lowestAskingCurrent.toFixed(2)} - $${prices.highestAskingCurrent.toFixed(2)}) - Items: ${prices.items?.length || 0}`);
          } else {
            skuFailCount++;
            logSyncMessage(`[SKU ${i + 1}/${serverTrends.length}] ${skuLabel} - Status: FAILURE - No active listings found on eBay`);
          }
        } catch (e: any) {
          skuFailCount++;
          console.warn(`[GitHub Actions] eBay search failed for ${skuLabel}:`, e.message);
          logSyncMessage(`[SKU ${i + 1}/${serverTrends.length}] ${skuLabel} - Status: FAILURE - Error: ${e.message || e}`);
        }
        
        // Brief 500ms delay to respect eBay Browse API rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } else {
      console.warn('[GitHub Actions] eBay API token authentication failed. Falling back to Gemini search if available.');
      logSyncMessage(`eBay API OAuth authentication failed. Falling back to Gemini search.`);
    }
  } else {
    console.warn('[GitHub Actions] EBAY_APP_ID / EBAY_CERT_ID environment variables are not set or empty.');
    logSyncMessage(`eBay API credentials not configured. Falling back to Gemini search.`);
  }

  // 2. Fallback to Gemini AI if eBay API isn't configured or failed
  if (!usedEbay && ai) {
    console.log('[GitHub Actions] Querying live secondary market intelligence via Gemini Search (Fallback)...');
    logSyncMessage(`Starting Gemini AI search grounding fallback for ${serverTrends.length} SKUs...`);
    
    try {
      const searchPrompt = `
You are an ITAD server memory market analyst. 
Check recent eBay and secondary IT refurbisher asking prices for enterprise ECC RDIMM server memory (DDR4 32GB/64GB, DDR5 32GB/64GB/128GB).
Provide a concise 2-sentence summary of secondary market price clearing movements today.
`;
      const res = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: searchPrompt,
        config: { tools: [{ googleSearch: {} }] },
      });
      liveMarketNotes = res.text || '';
    } catch (summaryErr: any) {
      console.warn('[GitHub Actions] Live market summary failed (likely rate limit):', summaryErr.message);
    }

    await new Promise(resolve => setTimeout(resolve, 8000));
    console.log('[GitHub Actions] Starting individual SKU price search with 8s delays (Rate limit: 15 RPM)...');
    
    for (let i = 0; i < serverTrends.length; i++) {
      const trend = serverTrends[i];
      const skuLabel = `${trend.generation} ${trend.capacityGB}GB ${trend.speedMTs}MT/s ECC RDIMM`;
      console.log(`[GitHub Actions] Checking SKU ${i + 1}/${serverTrends.length}: ${skuLabel}...`);
      
      try {
        const skuPrompt = `
Search the live web for the current secondary market price PER SINGLE MODULE (unit price for 1x stick, used/refurbished, NOT lots or multi-packs) for: ${trend.capacityGB}GB ${trend.generation} ${trend.speedMTs} ECC RDIMM server memory.
CRITICAL: All values must be normalized to ONE SINGLE RAM MODULE (per-unit price in USD). Do NOT return wholesale lot totals, tray totals, or multi-stick pack totals.
Return ONLY a valid JSON object with the following keys, containing only numbers (no symbols or text):
{
  "currentAvgPrice": 12.50,
  "lowestAskingCurrent": 9.50,
  "highestAskingCurrent": 18.00
}`;
        const skuRes = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: skuPrompt,
          config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: 'application/json'
          },
        });
        
        if (skuRes.text) {
           const parsed = JSON.parse(skuRes.text);
           if (parsed.currentAvgPrice) trend.currentAvgPrice = Number(parsed.currentAvgPrice);
           if (parsed.lowestAskingCurrent) trend.lowestAskingCurrent = Number(parsed.lowestAskingCurrent);
           if (parsed.highestAskingCurrent) trend.highestAskingCurrent = Number(parsed.highestAskingCurrent);
           skuSuccessCount++;
           logSyncMessage(`[SKU ${i + 1}/${serverTrends.length}] ${skuLabel} - Status: SUCCESS - Avg: $${trend.currentAvgPrice.toFixed(2)} (Range: $${trend.lowestAskingCurrent.toFixed(2)} - $${trend.highestAskingCurrent.toFixed(2)})`);
        } else {
           skuFailCount++;
           logSyncMessage(`[SKU ${i + 1}/${serverTrends.length}] ${skuLabel} - Status: FAILURE - Empty model response`);
        }
      } catch (skuErr: any) {
        skuFailCount++;
        console.warn(`[GitHub Actions] Failed to fetch data for ${skuLabel}:`, skuErr.message);
        logSyncMessage(`[SKU ${i + 1}/${serverTrends.length}] ${skuLabel} - Status: FAILURE - Error: ${skuErr.message || skuErr}`);
        if (skuErr.message && (skuErr.message.includes('429') || skuErr.message.includes('RESOURCE_EXHAUSTED') || skuErr.message.includes('quota'))) {
          console.warn('[GitHub Actions] Rate limit exceeded. Halting further Gemini fallback queries for this run.');
          logSyncMessage(`[RATE LIMIT] Halting further queries due to quota limit.`);
          break;
        }
      }
      
      if (i < serverTrends.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 8000));
      }
    }
  }

  
    const nowIso = new Date().toISOString();
  const todayMs = Date.now();
  
  // Save today's snapshot
  historicalSnapshots.push({
    date: nowIso,
    timestamp: todayMs,
    trends: serverTrends.map(t => ({
      generation: t.generation,
      capacityGB: t.capacityGB,
      speedMTs: t.speedMTs,
      currentAvgPrice: t.currentAvgPrice
    }))
  });

  // Prune snapshots older than 95 days
  const ninetyFiveDaysMs = 95 * 24 * 60 * 60 * 1000;
  historicalSnapshots = historicalSnapshots.filter(snap => todayMs - snap.timestamp < ninetyFiveDaysMs);

  // Recalculate maths dynamically from snapshots
  serverTrends = serverTrends.map((trend) => {
    // Find closest snapshot to 7 days ago
    const target7DaysMs = todayMs - (7 * 24 * 60 * 60 * 1000);
    // Find closest snapshot to 90 days ago
    const target90DaysMs = todayMs - (90 * 24 * 60 * 60 * 1000);

    let snap7Days = null;
    let snap90Days = null;
    let snap7Diff = Infinity;
    let snap90Diff = Infinity;

    for (const snap of historicalSnapshots) {
      const diff7 = Math.abs(snap.timestamp - target7DaysMs);
      const diff90 = Math.abs(snap.timestamp - target90DaysMs);
      
      // Only accept if within 2 days of the target
      if (diff7 < snap7Diff && diff7 <= 2 * 24 * 60 * 60 * 1000) {
        snap7Diff = diff7;
        snap7Days = snap;
      }
      if (diff90 < snap90Diff && diff90 <= 5 * 24 * 60 * 60 * 1000) {
        snap90Diff = diff90;
        snap90Days = snap;
      }
    }

    const match7 = snap7Days ? snap7Days.trends.find((t: any) => t.generation === trend.generation && t.capacityGB === trend.capacityGB && t.speedMTs === trend.speedMTs) : null;
    const match90 = snap90Days ? snap90Days.trends.find((t: any) => t.generation === trend.generation && t.capacityGB === trend.capacityGB && t.speedMTs === trend.speedMTs) : null;

    const base7Price = (match7 && match7.currentAvgPrice) ? match7.currentAvgPrice : (trend.avgPrice1WeekAgo || trend.currentAvgPrice);
    let weekChangePct = null;
    if (base7Price) {
      weekChangePct = ((trend.currentAvgPrice - base7Price) / base7Price) * 100;
    }
    
    const base90Price = (match90 && match90.currentAvgPrice) ? match90.currentAvgPrice : (trend.avgPrice3MoAgo || trend.currentAvgPrice);
    let changePct = null;
    if (base90Price) {
      changePct = ((trend.currentAvgPrice - base90Price) / base90Price) * 100;
    }

    const pricePerGb = Math.round((trend.currentAvgPrice / trend.capacityGB) * 100) / 100;
    
    return {
      ...trend,
      threeMonthChangePercent: changePct !== null ? Math.round(changePct * 10) / 10 : null,
      oneWeekChangePercent: weekChangePct !== null ? Math.round(weekChangePct * 10) / 10 : null,
      trendDirection: changePct !== null && changePct > 0.5 ? 'up' : changePct !== null && changePct < -0.5 ? 'down' : 'stable',
      pricePerGB: pricePerGb,
    };
  });

  serverListings = serverListings.map((listing) => ({
    ...listing,
    scrapedAt: nowIso,
  }));

  const logEntry = {
    timestamp: nowIso,
    type: 'SCHEDULED',
    status: skuFailCount === 0 ? 'SUCCESS' : skuSuccessCount > 0 ? 'PARTIAL' : 'ERROR',
    message: liveMarketNotes
      ? (usedEbay ? liveMarketNotes : `Recalculated ${serverTrends.length} SKUs with live search grounding: ${liveMarketNotes.slice(0, 100)}...`)
      : `Recalculated ${serverTrends.length} SKUs and updated secondary price floors/ceilings.`,
    skusUpdated: serverTrends.length,
    ebayRecordsSuccess: skuSuccessCount,
    jsonUpdated: true,
    dataSource: usedEbay ? 'eBay Production API (Realistic Search)' : 'Gemini Fallback Search',
  };
  cronLogs.unshift(logEntry);
  if (cronLogs.length > 50) cronLogs.pop();

  // Save today's curated snapshot for daily research retention
  curatedSnapshots.push({
    date: nowIso.split('T')[0],
    timestamp: todayMs,
    totalListings: serverListings.length,
    listingsSummary: serverListings.map(l => ({
      id: l.id,
      generation: l.generation,
      capacityGB: l.capacityGB,
      speedMTs: l.speedMTs,
      vendor: l.vendor,
      pricePerUnit: l.pricePerUnit,
    }))
  });
  curatedSnapshots = curatedSnapshots.filter(snap => todayMs - snap.timestamp < ninetyFiveDaysMs);

  const curatedPayload = {
    success: true,
    description: 'Enterprise ITAD Curated Benchmark Catalog (90-Day Retention)',
    metadata: serverMetadata,
    curatedListings: serverListings,
    dailySnapshots: curatedSnapshots,
  };

  const ebayPayload = {
    success: true,
    description: 'Live eBay API Research & 3-Month Market Trends ("Exact eBay Active Listings & Market Spread")',
    ebayListings: allLiveEbayListings,
    ebaySold: serverEbaySold,
    trends: serverTrends,
    cronInfo: {
      schedule: '0 0 * * *',
      scheduleDescription: 'GitHub Actions workflow triggers daily at 08:00 AM UTC+8 (00:00 UTC)',
      lastRun: nowIso,
      nextRun: 'Managed by GitHub Actions schedule',
      isRefreshing: false,
      storageType: 'Static JSON on GitHub Pages ($0 Hosting/DB Cost)',
      totalSkusAudited: serverTrends.length,
      ebayRecordsSuccess: skuSuccessCount,
      totalLiveEbayListings: allLiveEbayListings.length,
      totalCuratedListings: serverListings.length,
      jsonUpdated: true,
      dataSource: usedEbay ? 'eBay Production API (Realistic Search)' : 'Gemini Fallback Search',
      recentLogs: cronLogs,
    },
    historicalSnapshots
  };

  fs.writeFileSync(CURATED_DATA_FILE, JSON.stringify(curatedPayload, null, 2), 'utf-8');
  fs.writeFileSync(EBAY_DATA_FILE, JSON.stringify(ebayPayload, null, 2), 'utf-8');
  console.log(`[GitHub Actions] Successfully updated ${CURATED_DATA_FILE} (Curated Catalog) and ${EBAY_DATA_FILE} (eBay Research & Trends)`);

  logSyncMessage(`=== SYNC FINISHED - Total SKUs: ${serverTrends.length}, Success: ${skuSuccessCount}, Failed: ${skuFailCount} - Source: ${usedEbay ? 'eBay Production API' : 'Gemini Fallback Search'} - Overall: ${skuFailCount === 0 ? 'SUCCESS' : skuSuccessCount > 0 ? 'PARTIAL SUCCESS' : 'FAILED'} ===`);
}

updateMarketData().catch(err => {
  console.error('[GitHub Actions] Error running update:', err);
  process.exit(1);
});
