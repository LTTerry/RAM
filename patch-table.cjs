const fs = require('fs');
let content = fs.readFileSync('src/components/ListingsTable.tsx', 'utf-8');

// 1. Re-add the table headers
const headerTarget = `
                </th>
                <th className="py-3 px-3 whitespace-nowrap">Condition & Testing</th>`;
const headerReplacement = `
                </th>
                {catalogType === 'curatedBenchmark' && (
                  <>
                    <th className="py-3 px-3 whitespace-nowrap">1-Week Trend</th>
                    <th className="py-3 px-3 whitespace-nowrap">90-Day Trend</th>
                  </>
                )}
                <th className="py-3 px-3 whitespace-nowrap">Condition & Testing</th>`;
content = content.replace(headerTarget, headerReplacement);

// 2. Re-add the table cells
const cellTarget = `
                      {/* Condition & Tested */}`;
const cellReplacement = `
                      {/* Trends (Curated only) */}
                      {catalogType === 'curatedBenchmark' && (
                        <>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {itemTrend ? (
                              <OneWeekTrendBadge trend={itemTrend} />
                            ) : (
                              <span className="text-slate-600 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {itemTrend ? (
                              <TrendSparkline trend={itemTrend} />
                            ) : (
                              <span className="text-slate-600 text-xs">—</span>
                            )}
                          </td>
                        </>
                      )}

                      {/* Condition & Tested */}`;
content = content.replace(cellTarget, cellReplacement);

// 3. Update TrendSparkline to handle null
const sparklineTarget = `const TrendSparkline = ({ trend }: { trend: MarketTrend }) => {
  const points = [
    trend.avgPrice3MoAgo,
    trend.avgPrice2MoAgo,
    trend.avgPrice1MoAgo,
    trend.currentAvgPrice
  ];`;
const sparklineReplacement = `const TrendSparkline = ({ trend }: { trend: MarketTrend }) => {
  if (trend.threeMonthChangePercent === null || trend.threeMonthChangePercent === undefined) {
    return <div className="text-xs text-slate-500 italic">Gathering Data...</div>;
  }
  const points = [
    trend.avgPrice3MoAgo,
    trend.avgPrice2MoAgo,
    trend.avgPrice1MoAgo,
    trend.currentAvgPrice
  ];`;
content = content.replace(sparklineTarget, sparklineReplacement);

// 4. Update OneWeekTrendBadge to handle null
const badgeTarget = `const OneWeekTrendBadge = ({ trend }: { trend: MarketTrend }) => {
  const isUp = trend.oneWeekChangePercent > 0;`;
const badgeReplacement = `const OneWeekTrendBadge = ({ trend }: { trend: MarketTrend }) => {
  if (trend.oneWeekChangePercent === null || trend.oneWeekChangePercent === undefined) {
    return <div className="text-xs text-slate-500 italic">Gathering Data...</div>;
  }
  const isUp = trend.oneWeekChangePercent > 0;`;
content = content.replace(badgeTarget, badgeReplacement);

fs.writeFileSync('src/components/ListingsTable.tsx', content);
console.log("Patched ListingsTable!");
