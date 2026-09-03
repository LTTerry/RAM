const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const fetchTarget = `  // Fetch static market data from GitHub Pages host on load
  const fetchMarketData = async () => {
    try {
      // Add timestamp query and no-store to ensure latest version is fetched without browser caching
      const res = await fetch(\`\${import.meta.env.BASE_URL}market-data.json?t=\${Date.now()}\`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (Array.isArray(data.ebayListings) && data.ebayListings.length > 0) {
            setLiveEbayListings(data.ebayListings);
          } else if (Array.isArray(data.listings) && data.listings.length > 0) {
            setLiveEbayListings(data.listings);
          }

          if (Array.isArray(data.curatedListings) && data.curatedListings.length > 0) {
            setCuratedListings(data.curatedListings);
          } else {
            setCuratedListings(INITIAL_CURATED_LISTINGS);
          }

          if (data.metadata) {
            setMetadata(data.metadata);
          }
          if (Array.isArray(data.trends) && data.trends.length > 0) {
            setTrends(data.trends);
          }
          if (data.cronInfo) {
            setCronInfo(data.cronInfo);
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch market-data.json, using fallback local state:', err);
    }
  };`;

const fetchReplacement = `  // Fetch static market data from GitHub Pages host on load
  const fetchMarketData = async () => {
    try {
      // Add timestamp query and no-store to ensure latest version is fetched without browser caching
      const headers = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      };
      
      const [curatedRes, ebayRes] = await Promise.all([
        fetch(\`\${import.meta.env.BASE_URL}curated-data.json?t=\${Date.now()}\`, { cache: 'no-store', headers }).catch(() => null),
        fetch(\`\${import.meta.env.BASE_URL}ebay-data.json?t=\${Date.now()}\`, { cache: 'no-store', headers }).catch(() => null)
      ]);

      if (curatedRes && curatedRes.ok) {
        const curatedData = await curatedRes.json();
        if (curatedData.success) {
          if (Array.isArray(curatedData.curatedListings) && curatedData.curatedListings.length > 0) {
            setCuratedListings(curatedData.curatedListings);
          } else {
            setCuratedListings(INITIAL_CURATED_LISTINGS);
          }
          if (curatedData.metadata) {
            setMetadata(curatedData.metadata);
          }
          if (Array.isArray(curatedData.trends) && curatedData.trends.length > 0) {
            setTrends(curatedData.trends);
          }
          if (curatedData.cronInfo) {
            setCronInfo(curatedData.cronInfo);
          }
        }
      }

      if (ebayRes && ebayRes.ok) {
        const ebayData = await ebayRes.json();
        if (ebayData.success) {
          if (Array.isArray(ebayData.ebayListings) && ebayData.ebayListings.length > 0) {
            setLiveEbayListings(ebayData.ebayListings);
          } else if (Array.isArray(ebayData.listings) && ebayData.listings.length > 0) {
            setLiveEbayListings(ebayData.listings);
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch data files, using fallback local state:', err);
    }
  };`;

content = content.replace(fetchTarget, fetchReplacement);

fs.writeFileSync('src/App.tsx', content);
console.log("App.tsx patched!");
