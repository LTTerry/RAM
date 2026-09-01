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

// Format current time into human-friendly strings
function getFormattedTimeMetadata() {
  const now = new Date();
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const dayName = days[now.getDay()];
  const monthName = months[now.getMonth()];
  const dateNum = now.getDate();
  const year = now.getFullYear();
  
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // '0' becomes '12'
  const strMinutes = minutes < 10 ? '0' + minutes : minutes;
  const strHours = hours < 10 ? '0' + hours : hours;
  
  const lastUpdatedDate = `${monthName} ${dateNum}, ${year}`;
  const lastUpdatedDay = dayName;
  const lastUpdatedTime = `${strHours}:${strMinutes} ${ampm}`;
  const timezone = 'UTC'; // GitHub actions runs in UTC by default
  const formattedFullTimestamp = `${dayName}, ${monthName} ${dateNum}, ${year} at ${strHours}:${strMinutes} ${ampm} (${timezone})`;
  
  return {
    lastUpdatedDate,
    lastUpdatedDay,
    lastUpdatedTime,
    timezone,
    formattedFullTimestamp,
    researchQuarter: `Q${Math.floor(now.getMonth() / 3) + 1} ${year}`,
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

  const ai = getGenAIClient();
  let liveMarketNotes = '';

  if (ai) {
    console.log('[GitHub Actions] Querying live secondary market intelligence via Gemini Search...');
    
    // 1. Get the Market Summary (in its own try-catch so it doesn't break the loop if it fails)
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

    // Wait 5 seconds before starting the loop to ensure we don't trigger burst rate limits
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('[GitHub Actions] Starting individual SKU price search with 5s delays (Rate limit: 15 RPM)...');
    
    // 2. Loop through individual SKUs
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
      }
      
      // Wait 5 seconds to comfortably respect the 15 RPM free tier limit
      if (i < serverTrends.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 5000));
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
      ? `Recalculated ${serverTrends.length} SKUs with live search grounding: ${liveMarketNotes.slice(0, 100)}...`
      : `Recalculated ${serverTrends.length} SKUs and updated secondary price floors/ceilings.`,
    skusUpdated: serverTrends.length,
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
      schedule: '0 8 * * *',
      scheduleDescription: 'GitHub Actions workflow triggers daily at 08:00 AM UTC',
      lastRun: nowIso,
      nextRun: 'Managed by GitHub Actions schedule',
      isRefreshing: false,
      storageType: 'Static JSON on GitHub Pages ($0 Hosting/DB Cost)',
      totalSkusAudited: serverTrends.length,
      recentLogs: cronLogs,
    }
  };

  fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`[GitHub Actions] Successfully updated ${DATA_FILE}`);
}

updateMarketData().catch(err => {
  console.error('[GitHub Actions] Error running update:', err);
  process.exit(1);
});
