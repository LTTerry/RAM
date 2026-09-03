import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

// Relative imports for data
import { INITIAL_RAM_LISTINGS } from '../src/data/initialMemoryData.js';
import { MARKET_TRENDS_DATA } from '../src/data/marketTrendsData.js';
import { EBAY_SOLD_RECORDS } from '../src/data/ebaySoldData.js';
import { CURRENT_RESEARCH_METADATA } from '../src/data/researchMetadata.js';

dotenv.config();

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

// Extract lot quantity and calculate true per-unit price to prevent multi-pack/tray distortion
function extractLotQuantityAndUnitPrice(title: string, rawPrice: number, referenceUnitPrice?: number): { lotQuantity: number; unitPrice: number } {
  if (!title || rawPrice <= 0) return { lotQuantity: 1, unitPrice: rawPrice };
  
  const t = title.toLowerCase();
  let lotQty = 1;

  // 1. "lot of X", "lot of: X", "lot of (X)"
  const lotOfMatch = t.match(/\blot\s*(?:of)?\s*[:#]?\s*\(?(\d+)\)?\b/i);
  if (lotOfMatch) {
    const val = parseInt(lotOfMatch[1], 10);
    if (val > 1 && val <= 500) lotQty = val;
  }

  // 2. "qty X", "qty: X", "quantity X"
  if (lotQty === 1) {
    const qtyMatch = t.match(/\b(?:qty|quantity)\s*[:#]?\s*\(?(\d+)\)?\b/i);
    if (qtyMatch) {
      const val = parseInt(qtyMatch[1], 10);
      if (val > 1 && val <= 500) lotQty = val;
    }
  }

  // 3. "X pack", "X-pack", "X pk", "pack of X"
  if (lotQty === 1) {
    const packMatch = t.match(/\b(?:pack\s*of\s*(\d+)|(\d+)\s*[- ]?(?:pack|pk))\b/i);
    if (packMatch) {
      const val = parseInt(packMatch[1] || packMatch[2], 10);
      if (val > 1 && val <= 500) lotQty = val;
    }
  }

  // 4. "matched pair", "pair of 2", "2 sticks"
  if (lotQty === 1) {
    if (/\b(?:matched\s+pair|pair\s+of\s+2|2\s*(?:x\s*)?sticks|kit\s*of\s*2)\b/i.test(t)) {
      lotQty = 2;
    } else if (/\b(?:kit\s*of\s*4|4\s*(?:x\s*)?sticks)\b/i.test(t)) {
      lotQty = 4;
    }
  }

  // 5. "4x", "8x", "16x", "32x", "64x" (ensure not rank like 1Rx4, 2Rx4, 2Rx8, 4Rx4, 8Rx4)
  if (lotQty === 1) {
    const xMatch = t.match(/(?<![0-9]r)\b(\d+)\s*x\b/i);
    if (xMatch) {
      const val = parseInt(xMatch[1], 10);
      if (val > 1 && val <= 500) {
        lotQty = val;
      }
    }
  }

  let unitPrice = rawPrice / lotQty;

  // 6. If the unitPrice is still over 3x the reference price, check if title didn't specify quantity but price is a bulk tray
  if (referenceUnitPrice && referenceUnitPrice > 0) {
    if (unitPrice > referenceUnitPrice * 3.2) {
      const impliedQty = Math.round(rawPrice / referenceUnitPrice);
      if (impliedQty >= 2 && impliedQty <= 200) {
        unitPrice = rawPrice / impliedQty;
        lotQty = impliedQty;
      }
    }
  }

  return { lotQuantity: lotQty, unitPrice: Number(unitPrice.toFixed(2)) };
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
      const normalized = extractLotQuantityAndUnitPrice(title, raw, refPrice);
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
        id: `ebay-${trend.generation.toLowerCase()}-${trend.capacityGB}-${trend.speedMTs}-${cleanId}-${idx}`,
        generation: trend.generation,
        capacityGB: trend.capacityGB,
        speedMTs: trend.speedMTs,
        speedStandard: buildSpeedStandard(trend.generation, trend.speedMTs),
        moduleType: (trend.capacityGB >= 128 && trend.generation === 'DDR4') ? 'LRDIMM' : (trend.generation === 'DDR5' && trend.capacityGB >= 128) ? '3DS RDIMM' : 'RDIMM',
        rank: normalized.lotQuantity > 1 ? `Lot of ${normalized.lotQuantity}x` : '2Rx4',
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
  
  let serverListings = [...INITIAL_RAM_LISTINGS];
  let serverTrends = [...MARKET_TRENDS_DATA];
  let serverEbaySold = [...EBAY_SOLD_RECORDS];
  let serverMetadata = { ...CURRENT_RESEARCH_METADATA };
  let cronLogs: any[] = [];
  
  // Try to load existing data so we don't lose logs or previous state
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.listings && parsed.trends) {
        serverListings = parsed.listings;
        serverTrends = parsed.trends;
        serverEbaySold = parsed.ebaySold || serverEbaySold;
        serverMetadata = parsed.metadata || serverMetadata;
        cronLogs = parsed.cronInfo?.recentLogs || [];
      }
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

  // Recalculate maths
  serverTrends = serverTrends.map((trend) => {
    const changePct = ((trend.currentAvgPrice - trend.avgPrice3MoAgo) / trend.avgPrice3MoAgo) * 100;
    const pricePerGb = Math.round((trend.currentAvgPrice / trend.capacityGB) * 100) / 100;
    return {
      ...trend,
      threeMonthChangePercent: Math.round(changePct * 10) / 10,
      trendDirection: changePct > 0.5 ? 'up' : changePct < -0.5 ? 'down' : 'stable',
      pricePerGB: pricePerGb,
    };
  });

  const nowIso = new Date().toISOString();
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

  const payload = {
    success: true,
    metadata: serverMetadata,
    curatedListings: serverListings,
    ebayListings: allLiveEbayListings,
    listings: allLiveEbayListings.length > 0 ? allLiveEbayListings : serverListings,
    trends: serverTrends,
    ebaySold: serverEbaySold,
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
    }
  };

  fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`[GitHub Actions] Successfully updated ${DATA_FILE}`);

  logSyncMessage(`=== SYNC FINISHED - Total SKUs: ${serverTrends.length}, Success: ${skuSuccessCount}, Failed: ${skuFailCount} - Source: ${usedEbay ? 'eBay Production API' : 'Gemini Fallback Search'} - Overall: ${skuFailCount === 0 ? 'SUCCESS' : skuSuccessCount > 0 ? 'PARTIAL SUCCESS' : 'FAILED'} ===`);
}

updateMarketData().catch(err => {
  console.error('[GitHub Actions] Error running update:', err);
  process.exit(1);
});
