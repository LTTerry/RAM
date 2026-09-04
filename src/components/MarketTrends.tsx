import React, { useState } from 'react';
import { 
  TrendingDown, 
  TrendingUp, 
  Minus, 
  BarChart3, 
  Calendar, 
  Layers, 
  Sparkles, 
  ShieldCheck, 
  Building2, 
  ArrowDownRight,
  Info,
  DollarSign,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  Calculator,
  HelpCircle
} from 'lucide-react';
import { CalculationFormulasModal } from './CalculationFormulasModal';
import { MARKET_TRENDS_DATA, THREE_MONTH_MARKET_SUMMARY } from '../data/marketTrendsData';
import { CURRENT_RESEARCH_METADATA, ResearchMetadata } from '../data/researchMetadata';
import { MemoryGeneration, MarketTrend } from '../types';
import { SupportedTimezone, formatToTimezone } from '../utils/timeFormat';

interface MarketTrendsProps {
  metadata?: ResearchMetadata;
  trends?: MarketTrend[];
  selectedTimezone?: SupportedTimezone;
  lastUpdatedTimestamp?: string;
}

export const MarketTrends: React.FC<MarketTrendsProps> = ({
  metadata = CURRENT_RESEARCH_METADATA,
  trends = MARKET_TRENDS_DATA,
  selectedTimezone = 'Asia/Hong_Kong',
  lastUpdatedTimestamp,
}) => {
  const [selectedGen, setSelectedGen] = useState<'ALL' | 'DDR3' | 'DDR4' | 'DDR5' | 'DDR5_MONO' | 'DDR5_3DS'>('ALL');
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);

  const isDDR5_3DS = (t: any) => t.generation === 'DDR5' && (t.capacityGB === 256 || (t.capacityGB === 128 && t.analysisNotes.toLowerCase().includes('3ds')));
  const isDDR5_MONO = (t: any) => t.generation === 'DDR5' && !isDDR5_3DS(t);

  const filteredTrends = trends.filter(t => {
    if (selectedGen === 'ALL') return true;
    if (selectedGen === 'DDR5_MONO') return isDDR5_MONO(t);
    if (selectedGen === 'DDR5_3DS') return isDDR5_3DS(t);
    return t.generation === selectedGen;
  });

  const displayFindings = THREE_MONTH_MARKET_SUMMARY.keyFindings;

  return (
    <div className="space-y-5">
      {/* Overview Banner */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="bg-indigo-500/10 text-indigo-400 font-semibold px-2.5 py-0.5 rounded text-[11px] border border-indigo-500/20">
                ITAD Used Memory Valuation Trajectory
              </span>
              <span className="bg-slate-950 text-slate-300 border border-slate-800 px-3 py-0.5 rounded-full text-xs flex items-center gap-1.5 font-mono">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Research Update: <strong className="text-white font-semibold">{formatToTimezone(lastUpdatedTimestamp || metadata.isoTimestamp || "2026-09-04T02:57:22.498Z", selectedTimezone).dateString}</strong> at <strong className="text-amber-300 font-semibold">{formatToTimezone(lastUpdatedTimestamp || metadata.isoTimestamp || "2026-09-04T02:57:22.498Z", selectedTimezone).timeString}</strong> <span className="text-slate-500">({formatToTimezone(lastUpdatedTimestamp || metadata.isoTimestamp || "2026-09-04T02:57:22.498Z", selectedTimezone).tzOffsetLabel} {formatToTimezone(lastUpdatedTimestamp || metadata.isoTimestamp || "2026-09-04T02:57:22.498Z", selectedTimezone).tzBadge})</span>
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Used ECC Server RAM: Lowest, Highest & Trailing Price Dynamics
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-2 max-w-3xl">
              Comprehensive secondary market analysis tracking lowest liquidation wholesale floors, highest certified retail asks, and 90-day price trajectories across eBay, enterprise IT refurbishers, and B2B wholesale channels.
            </p>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono shrink-0">
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Research Edition</div>
            <div className="text-white font-bold text-sm mt-0.5">{metadata.researchQuarter} Benchmark</div>
            <div className="text-slate-400 text-[11px] mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{metadata.totalSkusAudited} Verified Enterprise SKUs</span>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-4 bg-slate-950 p-1 rounded-lg border border-slate-800 w-fit">
          <button
            onClick={() => setSelectedGen('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              selectedGen === 'ALL' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Gens
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

        {/* Key Market Insights Bento Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {displayFindings.map((finding, idx) => (
            <div key={idx} className="bg-slate-950/70 rounded-xl p-4 border border-slate-800">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">{finding.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{finding.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vendor Channel Price Dispersion */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2 uppercase tracking-wider">
          <Building2 className="w-4 h-4 text-indigo-400" />
          Vendor Channel Price Spread & Warranty Premium Matrix
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {THREE_MONTH_MARKET_SUMMARY.vendorPriceComparison.map((v, i) => (
            <div key={i} className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/70">
              <div className="font-bold text-xs text-indigo-300">{v.vendor}</div>
              <div className="text-xs text-slate-400 mt-1">{v.avgPriceFactor}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Trajectory Breakdown Table */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
              <span>Exact eBay Active Listings & Market Spread</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-normal">
                Zero Estimates
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Exact lowest active listing price (bulk lot unit price or system pull), exact highest active listing price (single Buy-It-Now / OEM certified), and active market spreads.
            </p>
          </div>

          <button
            onClick={() => setIsFormulaModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-sm shrink-0 border border-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
            title="View calculation formulas for Exact eBay Avg, Spread, 90-Day Change, and Retail $/GB"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Calculation Formulas</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[10px]">
                <th className="py-3 px-3.5">Gen</th>
                <th className="py-3 px-3.5">Capacity</th>
                <th className="py-3 px-3.5">Speed</th>
                <th className="py-3 px-3.5 text-right text-indigo-300">🛒 Exact 1x Buy-It-Now ($)</th>
                <th className="py-3 px-3.5 text-right text-emerald-400">🟢 Exact Lowest Listing ($)</th>
                <th className="py-3 px-3.5 text-right text-purple-300">🟣 Exact Highest Listing ($)</th>
                <th className="py-3 px-3.5 text-right text-sky-300">
                  <button
                    onClick={() => setIsFormulaModalOpen(true)}
                    className="inline-flex items-center gap-1 hover:text-white transition-colors cursor-pointer group"
                    title="Click to view Exact eBay Avg formula"
                  >
                    <span>⚖️ Exact eBay Avg ($)</span>
                    <HelpCircle className="w-3 h-3 text-sky-400 opacity-70 group-hover:opacity-100" />
                  </button>
                </th>
                <th className="py-3 px-3.5 text-right text-amber-300">
                  <button
                    onClick={() => setIsFormulaModalOpen(true)}
                    className="inline-flex items-center gap-1 hover:text-white transition-colors cursor-pointer group"
                    title="Click to view Market Spread formula"
                  >
                    <span>Spread ($)</span>
                    <HelpCircle className="w-3 h-3 text-amber-400 opacity-70 group-hover:opacity-100" />
                  </button>
                </th>
                <th className="py-3 px-3.5 text-right">3 Mo Ago</th>
                <th className="py-3 px-3.5 text-center">
                  <button
                    onClick={() => setIsFormulaModalOpen(true)}
                    className="inline-flex items-center gap-1 hover:text-white transition-colors cursor-pointer group"
                    title="Click to view 90-Day Change formula"
                  >
                    <span>90-Day Change</span>
                    <HelpCircle className="w-3 h-3 text-rose-400 opacity-70 group-hover:opacity-100" />
                  </button>
                </th>
                <th className="py-3 px-3.5 text-right">
                  <button
                    onClick={() => setIsFormulaModalOpen(true)}
                    className="inline-flex items-center gap-1 hover:text-white transition-colors cursor-pointer group"
                    title="Click to view Retail $/GB formula"
                  >
                    <span>Retail $/GB</span>
                    <HelpCircle className="w-3 h-3 text-indigo-400 opacity-70 group-hover:opacity-100" />
                  </button>
                </th>
                <th className="py-3 px-3.5">Activity & Analysis Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTrends.map((trend, idx) => {
                const isDown = trend.trendDirection === 'down';
                const isUp = trend.trendDirection === 'up';
                const spread = (trend.highestAskingCurrent || 0) - (trend.lowestAskingCurrent || 0);
                const retailPrice = trend.singleUnitRetailPrice || trend.currentAvgPrice;

                return (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    {/* Gen */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] uppercase font-mono ${
                        trend.generation === 'DDR3' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        trend.generation === 'DDR4' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {trend.generation === 'DDR5' 
                          ? (isDDR5_3DS(trend) ? 'DDR5 (3DS)' : 'DDR5 (Mono)') 
                          : trend.generation}
                      </span>
                    </td>

                    {/* Capacity */}
                    <td className="py-3 px-3.5 font-mono font-bold text-white whitespace-nowrap">
                      {trend.capacityGB} GB
                    </td>

                    {/* Speed */}
                    <td className="py-3 px-3.5 font-mono text-slate-300 whitespace-nowrap">
                      {trend.speedMTs} MT/s
                    </td>

                    {/* Single-Stick Retail Buy It Now */}
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-indigo-300 whitespace-nowrap bg-indigo-500/5">
                      ${retailPrice.toFixed(2)}
                    </td>

                    {/* Lowest (Floor) */}
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-400">
                      ${trend.lowestAskingCurrent ? trend.lowestAskingCurrent.toFixed(2) : '-'}
                    </td>

                    {/* Highest (Ceiling) */}
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-purple-300">
                      ${trend.highestAskingCurrent ? trend.highestAskingCurrent.toFixed(2) : '-'}
                    </td>

                    {/* Current Avg */}
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-sky-300">
                      ${trend.currentAvgPrice.toFixed(2)}
                    </td>

                    {/* Spread */}
                    <td className="py-3 px-3.5 text-right font-mono text-amber-300 font-medium">
                      +${spread.toFixed(2)}
                    </td>

                    {/* 3 Mo Ago */}
                    <td className="py-3 px-3.5 text-right font-mono text-slate-500">
                      ${trend.avgPrice3MoAgo.toFixed(2)}
                    </td>

                    {/* 90-Day Change */}
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      {trend.threeMonthChangePercent !== null && trend.threeMonthChangePercent !== undefined ? (
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded font-semibold text-[10px] font-mono ${
                          isDown ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          isUp ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {isDown ? <TrendingDown className="w-3 h-3 text-emerald-400" /> : isUp ? <TrendingUp className="w-3 h-3 text-rose-400" /> : <Minus className="w-3 h-3 text-slate-400" />}
                          {trend.threeMonthChangePercent > 0 ? `+${trend.threeMonthChangePercent}%` : `${trend.threeMonthChangePercent}%`}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono italic">Gathering Data...</span>
                      )}
                    </td>

                    {/* Retail Price/GB */}
                    <td className="py-3 px-3.5 text-right whitespace-nowrap font-mono font-semibold text-indigo-300">
                      ${(retailPrice / trend.capacityGB).toFixed(2)}/GB
                    </td>

                    {/* Notes */}
                    <td className="py-3 px-3.5 text-slate-300 max-w-[280px]">
                      <div className="font-semibold text-slate-200 text-[11px]">
                        {trend.marketActivityLevel} Liquidity
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-2">
                        {trend.analysisNotes}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <CalculationFormulasModal
        isOpen={isFormulaModalOpen}
        onClose={() => setIsFormulaModalOpen(false)}
      />
    </div>
  );
};
