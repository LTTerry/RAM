const fs = require('fs');

let content = fs.readFileSync('scripts/update-market-data.ts', 'utf-8');

// 1. Add new file definitions
content = content.replace(
  /const DATA_FILE = path.join\(process.cwd\(\), 'public', 'market-data.json'\);/,
  `const CURATED_DATA_FILE = path.join(process.cwd(), 'public', 'curated-data.json');\nconst EBAY_DATA_FILE = path.join(process.cwd(), 'public', 'ebay-data.json');\nconst DATA_FILE = path.join(process.cwd(), 'public', 'market-data.json');`
);

// 2. Change read logic to support migration from market-data.json to curated-data.json and ebay-data.json
const readTarget = `  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.listings && parsed.trends) {`;
const readReplacement = `  try {
    const curatedExists = fs.existsSync(CURATED_DATA_FILE);
    const ebayExists = fs.existsSync(EBAY_DATA_FILE);
    const oldExists = fs.existsSync(DATA_FILE);
    
    let curatedParsed = null;
    let ebayParsed = null;

    if (curatedExists && ebayExists) {
        curatedParsed = JSON.parse(fs.readFileSync(CURATED_DATA_FILE, 'utf-8'));
        ebayParsed = JSON.parse(fs.readFileSync(EBAY_DATA_FILE, 'utf-8'));
    } else if (oldExists) {
        curatedParsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        ebayParsed = curatedParsed; // fallback to same structure for migration
    }

    if (curatedParsed && curatedParsed.trends) {
      const parsed = curatedParsed;
      const parsedEbay = ebayParsed || parsed;`;
content = content.replace(readTarget, readReplacement);

content = content.replace(/serverEbaySold = parsed\.ebaySold \|\| serverEbaySold;/, `serverEbaySold = parsedEbay.ebaySold || serverEbaySold;`);

// 3. Change the write logic
const writeTarget = `  const payload = {
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
    },
    historicalSnapshots
  };

  fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(\`[GitHub Actions] Successfully updated \${DATA_FILE}\`);`;

const writeReplacement = `  const curatedPayload = {
    success: true,
    metadata: serverMetadata,
    curatedListings: serverListings,
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

  const ebayPayload = {
    success: true,
    ebayListings: allLiveEbayListings,
    ebaySold: serverEbaySold,
  };

  fs.writeFileSync(CURATED_DATA_FILE, JSON.stringify(curatedPayload, null, 2), 'utf-8');
  fs.writeFileSync(EBAY_DATA_FILE, JSON.stringify(ebayPayload, null, 2), 'utf-8');
  console.log(\`[GitHub Actions] Successfully updated \${CURATED_DATA_FILE} and \${EBAY_DATA_FILE}\`);`;

content = content.replace(writeTarget, writeReplacement);

fs.writeFileSync('scripts/update-market-data.ts', content);
console.log("update-market-data.ts Patched!");
