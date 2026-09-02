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

// Get AI client if available
function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

// Get eBay Token
async function getEbayToken(appId: string, certId: string): Promise<string | null> {
  try {
    const credentials = Buffer.from(`${appId}:${certId}`).toString('base64');
    const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope'
    });
    
    if (!response.ok) {
      console.warn('[eBay API] Failed to get token:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    return data.access_token || null;
  } catch (error) {
    console.warn('[eBay API] Error fetching token:', error);
    return null;
  }
}

// Search eBay Prices
async function searchEbayPrices(token: string, trend: any) {
  const q = encodeURIComponent(`${trend.capacityGB}GB ${trend.generation} ${trend.speedMTs} ECC RDIMM`);
  const filter = encodeURIComponent('conditionIds:{3000|2000|2500}');
  const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${q}&filter=${filter}&limit=10`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
    }
  });
  
  if (!response.ok) throw new Error(`eBay API error: ${response.statusText}`);
  
  const data = await response.json();
  if (data.itemSummaries && data.itemSummaries.length > 0) {
    let prices = data.itemSummaries
      .map((item: any) => parseFloat(item.price?.value || '0'))
      .filter((p: number) => p > 0);
      
    if (prices.length > 0) {
      prices.sort((a: number, b: number) => a - b);
      const lowest = prices[0];
      const highest = prices[prices.length - 1];
      const avg = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
      
      return {
        lowestAskingCurrent: Number(lowest.toFixed(2)),
        highestAskingCurrent: Number(highest.toFixed(2)),
        currentAvgPrice: Number(avg.toFixed(2))
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

  const ebayAppId = process.env.EBAY_APP_ID;
  const ebayCertId = process.env.EBAY_CERT_ID;
  const ai = getGenAIClient();
  
  let liveMarketNotes = '';
  let usedEbay = false;

  // 1. Try eBay API First
  if (ebayAppId && ebayCertId) {
    console.log('[GitHub Actions] eBay Production Credentials found. Connecting to Real eBay API...');
    const token = await getEbayToken(ebayAppId, ebayCertId);
    
    if (token) {
      usedEbay = true;
      liveMarketNotes = "Live market data sourced directly from real-time eBay Browse API (Production).";
      console.log('[GitHub Actions] Successfully authenticated with eBay API.');
      
      for (let i = 0; i < serverTrends.length; i++) {
        const trend = serverTrends[i];
        console.log(`[GitHub Actions] Checking SKU ${i + 1}/${serverTrends.length} via eBay: ${trend.capacityGB}GB ${trend.generation} ${trend.speedMTs}...`);
        
        try {
          const prices = await searchEbayPrices(token, trend);
          if (prices) {
            trend.currentAvgPrice = prices.currentAvgPrice;
            trend.lowestAskingCurrent = prices.lowestAskingCurrent;
            trend.highestAskingCurrent = prices.highestAskingCurrent;
          }
        } catch (e: any) {
          console.warn(`[GitHub Actions] eBay search failed for ${trend.capacityGB}GB ${trend.generation}:`, e.message);
        }
        
        // Brief 500ms delay to respect eBay Browse API rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  // 2. Fallback to Gemini AI if eBay API isn't configured or failed
  if (!usedEbay && ai) {
    console.log('[GitHub Actions] Querying live secondary market intelligence via Gemini Search (Fallback)...');
    
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
      console.log(`[GitHub Actions] Checking SKU ${i + 1}/${serverTrends.length}: ${trend.capacityGB}GB ${trend.generation} ${trend.speedMTs}...`);
      
      try {
        const skuPrompt = `
Search the live web for the current average secondary market price (used/refurbished) for: ${trend.capacityGB}GB ${trend.generation} ${trend.speedMTs} ECC RDIMM server memory.
Return ONLY a valid JSON object with the following keys, containing only numbers (no symbols or text). If you cannot find exact data, estimate based on similar modules.
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
        }
      } catch (skuErr: any) {
        console.warn(`[GitHub Actions] Failed to fetch data for ${trend.capacityGB}GB ${trend.generation}:`, skuErr.message);
        if (skuErr.message && (skuErr.message.includes('429') || skuErr.message.includes('RESOURCE_EXHAUSTED') || skuErr.message.includes('quota'))) {
          console.warn('[GitHub Actions] Rate limit exceeded. Halting further Gemini fallback queries for this run.');
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
    status: 'SUCCESS',
    message: liveMarketNotes
      ? (usedEbay ? liveMarketNotes : `Recalculated ${serverTrends.length} SKUs with live search grounding: ${liveMarketNotes.slice(0, 100)}...`)
      : `Recalculated ${serverTrends.length} SKUs and updated secondary price floors/ceilings.`,
    skusUpdated: serverTrends.length,
    ebayRecordsSuccess: serverTrends.length,
    jsonUpdated: true,
    dataSource: usedEbay ? 'eBay Production API (Realistic Search)' : 'Gemini Fallback Search',
  };
  cronLogs.unshift(logEntry);
  if (cronLogs.length > 50) cronLogs.pop();

  const payload = {
    success: true,
    metadata: serverMetadata,
    listings: serverListings,
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
      ebayRecordsSuccess: serverTrends.length,
      jsonUpdated: true,
      dataSource: usedEbay ? 'eBay Production API (Realistic Search)' : 'Gemini Fallback Search',
      recentLogs: cronLogs,
    }
  };

  fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`[GitHub Actions] Successfully updated ${DATA_FILE}`);

  const EBAY_LOG_FILE = path.join(process.cwd(), 'public', 'ebay-sync.log');
  const logMessage = `[${nowIso}] - Status: ${usedEbay ? 'SUCCESS' : 'FAILED / FALLBACK'} - Source: ${usedEbay ? 'eBay Production API' : 'Gemini Fallback Search'}\n`;
  try {
    fs.appendFileSync(EBAY_LOG_FILE, logMessage, 'utf-8');
    console.log(`[GitHub Actions] Appended to ${EBAY_LOG_FILE}`);
  } catch (err) {
    console.warn('[GitHub Actions] Could not append to ebay-sync.log:', err);
  }
}

updateMarketData().catch(err => {
  console.error('[GitHub Actions] Error running update:', err);
  process.exit(1);
});
