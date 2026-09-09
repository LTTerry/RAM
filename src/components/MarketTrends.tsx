import React, { useState, useMemo } from 'react';
import { 
  TrendingDown, 
  TrendingUp, 
  Minus, 
  BarChart3, 
  Clock, 
  Sparkles, 
  Calculator, 
  DollarSign, 
  Scale, 
  ArrowUpRight,
  Activity
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { CalculationFormulasModal } from './CalculationFormulasModal';
import { MARKET_TRENDS_DATA } from '../data/marketTrendsData';
import { CURRENT_RESEARCH_METADATA, ResearchMetadata } from '../data/researchMetadata';
import { MarketTrend } from '../types';
import { SupportedTimezone, formatToTimezone } from '../utils/timeFormat';

interface MarketTrendsProps {
  metadata?: ResearchMetadata;
  trends?: MarketTrend[];
  selectedTimezone?: SupportedTimezone;
  lastUpdatedTimestamp?: string;
  onSelectSpec?: (gen: string, cap: number, speed: number) => void;
}

type ChartMetric = 'price' | 'pricePerGB';

export const MarketTrends: React.FC<MarketTrendsProps> = ({
  metadata = CURRENT_RESEARCH_METADATA,
  trends = MARKET_TRENDS_DATA,
  selectedTimezone = 'Asia/Hong_Kong',
  lastUpdatedTimestamp,
  onSelectSpec
}) => {
  const [selectedGen, setSelectedGen] = useState<'ALL' | 'DDR3' | 'DDR4' | 'DDR5' | 'DDR5_MONO' | 'DDR5_3DS'>('ALL');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('price');
  const [selectedSkuKey, setSelectedSkuKey] = useState<string | null>(null);
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);

  const isDDR5_3DS = (t: MarketTrend) => t.generation === 'DDR5' && (t.capacityGB === 256 || (t.capacityGB === 128 && (t.analysisNotes || '').toLowerCase().includes('3ds')));
  const isDDR5_MONO = (t: MarketTrend) => t.generation === 'DDR5' && !isDDR5_3DS(t);

  // Filter trends based on selected generation tab
  const filteredTrends = useMemo(() => {
    return trends.filter(t => {
      if (selectedGen === 'DDR3' && t.generation !== 'DDR3') return false;
      if (selectedGen === 'DDR4' && t.generation !== 'DDR4') return false;
      if (selectedGen === 'DDR5' && t.generation !== 'DDR5') return false;
      if (selectedGen === 'DDR5_MONO' && !isDDR5_MONO(t)) return false;
      if (selectedGen === 'DDR5_3DS' && !isDDR5_3DS(t)) return false;
      return true;
    });
  }, [trends, selectedGen]);

  // Default selected SKU for the deep-dive chart
  const activeSelectedTrend = useMemo(() => {
    if (selectedSkuKey) {
      const found = trends.find(t => `${t.generation}-${t.capacityGB}-${t.speedMTs}` === selectedSkuKey);
      if (found) return found;
    }
    return filteredTrends.length > 0 ? filteredTrends[0] : trends[0];
  }, [selectedSkuKey, filteredTrends, trends]);

  // Prepare 5-point historical curve for the active SKU
  const activeSkuChartData = useMemo(() => {
    if (!activeSelectedTrend) return [];
    const t = activeSelectedTrend;
    const factor = chartMetric === 'pricePerGB' ? t.capacityGB : 1;

    return [
      {
        timeline: '90 Days Ago',
        shortName: '90d Ago',
        value: Number((t.avgPrice3MoAgo / factor).toFixed(2)),
        rawPrice: t.avgPrice3MoAgo,
        pricePerGB: Number((t.avgPrice3MoAgo / t.capacityGB).toFixed(2)),
      },
      {
        timeline: '60 Days Ago',
        shortName: '60d Ago',
        value: Number((t.avgPrice2MoAgo / factor).toFixed(2)),
        rawPrice: t.avgPrice2MoAgo,
        pricePerGB: Number((t.avgPrice2MoAgo / t.capacityGB).toFixed(2)),
      },
      {
        timeline: '30 Days Ago',
        shortName: '30d Ago',
        value: Number((t.avgPrice1MoAgo / factor).toFixed(2)),
        rawPrice: t.avgPrice1MoAgo,
        pricePerGB: Number((t.avgPrice1MoAgo / t.capacityGB).toFixed(2)),
      },
      {
        timeline: '7 Days Ago',
        shortName: '7d Ago',
        value: Number(((t.avgPrice1WeekAgo || t.avgPrice1MoAgo) / factor).toFixed(2)),
        rawPrice: t.avgPrice1WeekAgo || t.avgPrice1MoAgo,
        pricePerGB: Number(((t.avgPrice1WeekAgo || t.avgPrice1MoAgo) / t.capacityGB).toFixed(2)),
      },
      {
        timeline: 'Current (Today)',
        shortName: 'Today',
        value: Number((t.currentAvgPrice / factor).toFixed(2)),
        rawPrice: t.currentAvgPrice,
        pricePerGB: Number((t.currentAvgPrice / t.capacityGB).toFixed(2)),
      }
    ];
  }, [activeSelectedTrend, chartMetric]);

  // Summary market stats across filtered trends
  const marketSummaryStats = useMemo(() => {
    if (filteredTrends.length === 0) return { avgChange: 0, upCount: 0, downCount: 0, stableCount: 0 };
    const totalChange = filteredTrends.reduce((acc, curr) => acc + curr.threeMonthChangePercent, 0);
    const avgChange = totalChange / filteredTrends.length;
    const upCount = filteredTrends.filter(t => t.trendDirection === 'up').length;
    const downCount = filteredTrends.filter(t => t.trendDirection === 'down').length;
    const stableCount = filteredTrends.filter(t => t.trendDirection === 'stable').length;
    return { avgChange, upCount, downCount, stableCount };
  }, [filteredTrends]);

  return (
    <div className="space-y-5">
      {/* Overview Banner & Controls */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="bg-indigo-500/10 text-indigo-400 font-semibold px-2.5 py-0.5 rounded text-[11px] border border-indigo-500/20 flex items-center gap-1">
                <BarChart3 className="w-3.5 h-3.5" />
                90-Day Graphical Market Trajectory
              </span>
              <span className="bg-slate-950 text-slate-300 border border-slate-800 px-3 py-0.5 rounded-full text-xs flex items-center gap-1.5 font-mono">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Research Update: <strong className="text-white font-semibold">{formatToTimezone(lastUpdatedTimestamp || metadata.isoTimestamp || "2026-09-04T02:57:22.498Z", selectedTimezone).dateString}</strong> at <strong className="text-amber-300 font-semibold">{formatToTimezone(lastUpdatedTimestamp || metadata.isoTimestamp || "2026-09-04T02:57:22.498Z", selectedTimezone).timeString}</strong>
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <span>90-Day Valuation Trajectories & Price Shifts</span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-2 max-w-3xl leading-relaxed">
              Interactive historical price curves tracking 90-day momentum (90d ago &rarr; 60d ago &rarr; 30d ago &rarr; 7d ago &rarr; Today) across DDR3, DDR4, and DDR5 server ECC memory modules.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setIsFormulaModalOpen(true)}
              className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white text-xs font-semibold transition-all border border-slate-800 shadow-xs"
              title="View calculation formulas"
            >
              <Calculator className="w-3.5 h-3.5 text-indigo-400" />
              <span>Formulas Guide</span>
            </button>
          </div>
        </div>

        {/* Filters and View Switchers */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-2">
          {/* Generation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setSelectedGen('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                selectedGen === 'ALL' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Gens ({trends.length})
            </button>
            <button
              onClick={() => setSelectedGen('DDR3')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                selectedGen === 'DDR3' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              DDR3
            </button>
            <button
              onClick={() => setSelectedGen('DDR4')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                selectedGen === 'DDR4' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              DDR4
            </button>
            <button
              onClick={() => setSelectedGen('DDR5_MONO')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                selectedGen === 'DDR5_MONO' ? 'bg-emerald-600/90 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              DDR5 Monolithic
            </button>
            <button
              onClick={() => setSelectedGen('DDR5_3DS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                selectedGen === 'DDR5_3DS' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              DDR5 3DS
            </button>
          </div>

          {/* Metric Toggle: Price vs Price/GB */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setChartMetric('price')}
              className={`px-3 py-1.5 rounded font-medium transition-all flex items-center gap-1.5 ${
                chartMetric === 'price' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              Unit Price ($)
            </button>
            <button
              onClick={() => setChartMetric('pricePerGB')}
              className={`px-3 py-1.5 rounded font-medium transition-all flex items-center gap-1.5 ${
                chartMetric === 'pricePerGB' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              Avg $/GB
            </button>
          </div>
        </div>

        {/* 90-Day Momentum Summary Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Filtered Category Avg 90d Shift</div>
            <div className={`text-base font-bold font-mono mt-1 flex items-center gap-1 ${
              marketSummaryStats.avgChange > 0 ? 'text-rose-400' : marketSummaryStats.avgChange < 0 ? 'text-emerald-400' : 'text-slate-300'
            }`}>
              {marketSummaryStats.avgChange > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{marketSummaryStats.avgChange > 0 ? `+${marketSummaryStats.avgChange.toFixed(1)}%` : `${marketSummaryStats.avgChange.toFixed(1)}%`}</span>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Downward Trajectory (Discounting)</div>
            <div className="text-base font-bold font-mono mt-1 text-emerald-400 flex items-center gap-1">
              <TrendingDown className="w-4 h-4" />
              <span>{marketSummaryStats.downCount} SKUs</span>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Upward Trajectory (Premiums)</div>
            <div className="text-base font-bold font-mono mt-1 text-rose-400 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              <span>{marketSummaryStats.upCount} SKUs</span>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Stable Pricing Baseline</div>
            <div className="text-base font-bold font-mono mt-1 text-slate-300 flex items-center gap-1">
              <Minus className="w-4 h-4 text-slate-400" />
              <span>{marketSummaryStats.stableCount} SKUs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Focused Active SKU Detailed Area Chart Banner */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded font-bold text-[10px] font-mono uppercase ${
                activeSelectedTrend.generation === 'DDR3' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                activeSelectedTrend.generation === 'DDR4' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {activeSelectedTrend.generation === 'DDR5' 
                  ? (isDDR5_3DS(activeSelectedTrend) ? 'DDR5 (3DS)' : 'DDR5 (Mono)') 
                  : activeSelectedTrend.generation}
              </span>
              <h3 className="text-base font-bold text-white">
                {activeSelectedTrend.capacityGB}GB {activeSelectedTrend.speedMTs} MT/s Historical Trajectory
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {activeSelectedTrend.analysisNotes}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">90-Day Momentum</div>
              <div className={`text-base font-bold font-mono ${
                activeSelectedTrend.threeMonthChangePercent > 0 ? 'text-rose-400' :
                activeSelectedTrend.threeMonthChangePercent < 0 ? 'text-emerald-400' : 'text-slate-300'
              }`}>
                {activeSelectedTrend.threeMonthChangePercent > 0 ? `+${activeSelectedTrend.threeMonthChangePercent}%` : `${activeSelectedTrend.threeMonthChangePercent}%`}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800"></div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">Current eBay Avg</div>
              <div className="text-base font-bold font-mono text-sky-300">
                ${activeSelectedTrend.currentAvgPrice.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Area Chart for Active Trend */}
        <div className="h-[260px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activeSkuChartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSkuTrajectory" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timeline" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(val) => chartMetric === 'pricePerGB' ? `$${val}/GB` : `$${val}`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                formatter={(value: any) => [
                  `${chartMetric === 'pricePerGB' ? `$${Number(value).toFixed(2)}/GB` : `$${Number(value).toFixed(2)}`}`,
                  chartMetric === 'pricePerGB' ? 'Price per GB' : 'Normalized Avg Price'
                ]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#38bdf8"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorSkuTrajectory)"
                dot={{ r: 5, fill: '#38bdf8', stroke: '#0f172a', strokeWidth: 2 }}
                activeDot={{ r: 7 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-950/70 p-3 rounded-lg border border-slate-800 font-mono">
          <div className="flex flex-wrap items-center gap-4">
            <span>90d Ago Starting Price: <strong className="text-slate-300">${activeSelectedTrend.avgPrice3MoAgo.toFixed(2)}</strong></span>
            <span>Floor: <strong className="text-emerald-400">${activeSelectedTrend.lowestAskingCurrent.toFixed(2)}</strong></span>
            <span>Ceiling: <strong className="text-purple-300">${activeSelectedTrend.highestAskingCurrent.toFixed(2)}</strong></span>
            <span>Avg $/GB: <strong className="text-indigo-300">${(activeSelectedTrend.currentAvgPrice / activeSelectedTrend.capacityGB).toFixed(2)}/GB</strong></span>
          </div>
          <div className="text-slate-400">
            Click any card below to focus its interactive chart
          </div>
        </div>
      </div>

      {/* Grid of Graphical SKU Sparkline Cards */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>All SKU 90-Day Trajectory Charts ({filteredTrends.length} SKUs)</span>
          </h3>
          <span className="text-[11px] text-slate-400">
            Sparklines represent 90d Ago &rarr; 60d Ago &rarr; 30d Ago &rarr; 7d Ago &rarr; Today
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredTrends.map((t, idx) => {
            const isDown = t.trendDirection === 'down';
            const isUp = t.trendDirection === 'up';
            const skuKey = `${t.generation}-${t.capacityGB}-${t.speedMTs}`;
            const isSelected = activeSelectedTrend && `${activeSelectedTrend.generation}-${activeSelectedTrend.capacityGB}-${activeSelectedTrend.speedMTs}` === skuKey;

            // 5 data points for card sparkline
            const sparkData = [
              { val: t.avgPrice3MoAgo },
              { val: t.avgPrice2MoAgo },
              { val: t.avgPrice1MoAgo },
              { val: t.avgPrice1WeekAgo || t.avgPrice1MoAgo },
              { val: t.currentAvgPrice }
            ];

            const strokeColor = isDown ? '#10b981' : isUp ? '#f43f5e' : '#38bdf8';

            return (
              <div
                key={idx}
                onClick={() => setSelectedSkuKey(skuKey)}
                className={`p-4 rounded-xl border transition-all cursor-pointer bg-slate-900/60 hover:bg-slate-850 flex flex-col justify-between space-y-3 shadow-xs ${
                  isSelected
                    ? 'border-sky-500 ring-1 ring-sky-500/50 bg-slate-850'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded font-bold text-[9px] font-mono uppercase ${
                        t.generation === 'DDR3' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        t.generation === 'DDR4' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {t.generation === 'DDR5' ? (isDDR5_3DS(t) ? 'DDR5 3DS' : 'DDR5 Mono') : t.generation}
                      </span>
                      <span className="text-white font-bold text-sm font-mono">{t.capacityGB} GB</span>
                      <span className="text-slate-400 text-xs font-mono">{t.speedMTs} MT/s</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>{t.marketActivityLevel} Liquidity</span>
                    </div>
                  </div>

                  {/* 90-Day Change Pill */}
                  <div className={`px-2.5 py-1 rounded-md font-mono text-xs font-bold flex items-center gap-1 shrink-0 ${
                    isDown ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    isUp ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                    'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    {isDown ? <TrendingDown className="w-3.5 h-3.5" /> : isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                    <span>{t.threeMonthChangePercent > 0 ? `+${t.threeMonthChangePercent}%` : `${t.threeMonthChangePercent}%`}</span>
                  </div>
                </div>

                {/* Sparkline Visual Curve */}
                <div className="h-14 w-full bg-slate-950/60 rounded-lg p-1 border border-slate-800/80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparkData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                      <Line
                        type="monotone"
                        dataKey="val"
                        stroke={strokeColor}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '6px', fontSize: '11px', padding: '4px 8px' }}
                        formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'Avg Price']}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Key Price Metrics Footer */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800/80 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Today's eBay Avg:</span>
                    <strong className="text-sky-300 text-sm font-bold">${t.currentAvgPrice.toFixed(2)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>90d Ago Baseline:</span>
                    <span className="text-slate-300">${t.avgPrice3MoAgo.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Active Floor / Ceiling:</span>
                    <span className="text-slate-300">
                      <strong className="text-emerald-400">${t.lowestAskingCurrent.toFixed(2)}</strong> - <strong className="text-purple-300">${t.highestAskingCurrent.toFixed(2)}</strong>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-indigo-300 pt-0.5">
                    <span>Avg $/GB:</span>
                    <span>${(t.currentAvgPrice / t.capacityGB).toFixed(2)}/GB</span>
                  </div>
                </div>

                {/* Action footer */}
                <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500">
                  <span>{isSelected ? '★ Currently Selected' : 'Click to inspect in chart'}</span>
                  {onSelectSpec && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSpec(t.generation, t.capacityGB, t.speedMTs);
                      }}
                      className="text-sky-400 hover:text-sky-300 font-sans hover:underline flex items-center gap-0.5"
                    >
                      <span>View in Matrix</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Calculation Formulas Modal */}
      <CalculationFormulasModal
        isOpen={isFormulaModalOpen}
        onClose={() => setIsFormulaModalOpen(false)}
      />
    </div>
  );
};
