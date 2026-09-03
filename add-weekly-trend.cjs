const fs = require('fs');

const path = './src/data/marketTrendsData.ts';
let content = fs.readFileSync(path, 'utf8');

// We need to parse it, modify it, and stringify it back, or use regex.
// Since it's a TS file with `export const MARKET_TRENDS_DATA: MarketTrend[] = [...]`,
// let's do regex replacement.

content = content.replace(/avgPrice1MoAgo:\s*([\d.]+),/g, (match, p1) => {
  const avg1Mo = parseFloat(p1);
  return `avgPrice1MoAgo: ${avg1Mo},\n    avgPrice1WeekAgo: ${avg1Mo},`;
});

content = content.replace(/threeMonthChangePercent:\s*([\-\d.]+),/g, (match, p1) => {
  return `threeMonthChangePercent: ${p1},\n    oneWeekChangePercent: 0,`;
});

fs.writeFileSync(path, content);
console.log('Done modifying marketTrendsData.ts');
