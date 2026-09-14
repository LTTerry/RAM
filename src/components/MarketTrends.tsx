import React, { useState, useMemo, useRef } from 'react';
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
  Activity,
  SlidersHorizontal
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
import { useLanguage } from '../context/LanguageContext';

interface MarketTrendsProps {
  metadata?: ResearchMetadata;
  trends?: MarketTrend[];
  historicalSnapshots?: any[];
  selectedTimezone?: SupportedTimezone;
  lastUpdatedTimestamp?: string;
  onSelectSpec?: (gen: string, cap: number, speed: number) => void;
}

type ChartMetric = 'price' | 'pricePerGB';
type ChartTimeframe = 'daily' | '90day';

interface SkuGroup {
  key: string;
  label: string;
  labelZh: string;
  items: MarketTrend[];
}

export const MarketTrends: React.FC<MarketTrendsProps> = ({
  metadata = CURRENT_RESEARCH_METADATA,
  trends = MARKET_TRENDS_DATA,
  historicalSnapshots = [],
  selectedTimezone = 'Asia/Hong_Kong',
  lastUpdatedTimestamp,
  onSelectSpec
}) => {
  const { language, t } = useLanguage();
  const [selectedGen, setSelectedGen] = useState<'ALL' | 'DDR3' | 'DDR4' | 'DDR5' | 'DDR5_MONO' | 'DDR5_3DS'>('ALL');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('price');
  const [chartTimeframe, setChartTimeframe] = useState<ChartTimeframe>('daily');
  const [selectedSkuKey, setSelectedSkuKey] = useState<string | null>(null);
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);
  const chartSectionRef = useRef<HTMLDivElement>(null);

  const isDDR5_3DS = (t: MarketTrend) => {
    if (t.generation !== 'DDR5') return false;
    if (t.is3DS === false || t.technology === 'Monolithic' || (t.moduleType === 'RDIMM' && t.is3DS !== true)) {
      if (t.capacityGB !== 256 && t.is3DS !== true && t.technology !== '3DS TSV') return false;
    }
    if (t.is3DS === true || t.moduleType === '3DS RDIMM' || t.technology === '3DS TSV' || t.capacityGB === 256) {
      return true;
    }
    const notes = (t.analysisNotes || '').toLowerCase();
    const sold = (t.ebayHighestSoldLotInfo || '').toLowerCase();
    const isExplicit3DS = (/\b3ds\b/i.test(notes) && !/\bnon[- ]3ds\b/i.test(notes)) ||
                          (/\b3ds\b/i.test(sold) && !/\bnon[- ]3ds\b/i.test(sold)) ||
                          /\btsv\b/i.test(notes) || /\btsv\b/i.test(sold);
    return isExplicit3DS;
  };
  const isDDR5_MONO = (t: MarketTrend) => t.generation === 'DDR5' && !isDDR5_3DS(t);

  const getSkuKey = (t: MarketTrend) => {
    const subtype = t.generation === 'DDR5' ? (isDDR5_3DS(t) ? '-3ds' : '-mono') : '';
    return `${t.generation}-${t.capacityGB}-${t.speedMTs}${subtype}`;
  };

  // Group trends by generation for the SKU selector dropdown
  const groupedTrends = useMemo<SkuGroup[]>(() => {
    const ddr3: MarketTrend[] = [];
    const ddr4: MarketTrend[] = [];
    const ddr5Mono: MarketTrend[] = [];
    const ddr53ds: MarketTrend[] = [];

    trends.forEach(t => {
      if (t.generation === 'DDR3') ddr3.push(t);
      else if (t.generation === 'DDR4') ddr4.push(t);
      else if (isDDR5_3DS(t)) ddr53ds.push(t);
      else ddr5Mono.push(t);
    });

    return [
      { key: 'DDR3', label: 'DDR3 Registered ECC', labelZh: 'DDR3 寄存式 ECC', items: ddr3 },
      { key: 'DDR4', label: 'DDR4 Registered ECC', labelZh: 'DDR4 寄存式 ECC', items: ddr4 },
      { key: 'DDR5_MONO', label: 'DDR5 Monolithic', labelZh: 'DDR5 单芯片 (Mono 2Rx4)', items: ddr5Mono },
      { key: 'DDR5_3DS', label: 'DDR5 3DS High-Density', labelZh: 'DDR5 3DS 高密度堆叠', items: ddr53ds },
    ];
  }, [trends]);

  // Handler for card click with automatic smooth scroll to chart
  const handleSelectSku = (skuKey: string) => {
    setSelectedSkuKey(skuKey);
    if (chartSectionRef.current) {
      chartSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Helper to extract chronological daily snapshot prices for any SKU
  const getSkuDailyHistory = useMemo(() => {
    return (gen: string, cap: number, speed: number, is3dsCheck?: boolean) => {
      if (!historicalSnapshots || historicalSnapshots.length === 0) return [];
      
      const byDate = new Map<string, {
        date: string;
        iso: string;
        timestamp: number;
        price: number;
      }>();

      // Sort chronologically
      const sorted = [...historicalSnapshots].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

      for (const snap of sorted) {
        const snapDate = snap.date ? snap.date.split('T')[0] : '';
        if (!snapDate) continue;
        const match = (snap.trends || []).find(
          (t: any) => {
            if (t.generation !== gen || t.capacityGB !== cap || t.speedMTs !== speed) return false;
            if (gen === 'DDR5' && is3dsCheck !== undefined) {
              const itemIs3ds = isDDR5_3DS(t);
              if (itemIs3ds !== is3dsCheck) return false;
            }
            return true;
          }
        );
        if (match && typeof match.currentAvgPrice === 'number' && match.currentAvgPrice > 0) {
          byDate.set(snapDate, {
            date: snapDate,
            iso: snap.date,
            timestamp: snap.timestamp,
            price: match.currentAvgPrice
          });
        }
      }

      return Array.from(byDate.values());
    };
  }, [historicalSnapshots]);

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
      const found = trends.find(t => getSkuKey(t) === selectedSkuKey || `${t.generation}-${t.capacityGB}-${t.speedMTs}` === selectedSkuKey);
      if (found) return found;
    }
    return filteredTrends.length > 0 ? filteredTrends[0] : trends[0];
  }, [selectedSkuKey, filteredTrends, trends]);

  // Daily points recorded for the currently active SKU
  const activeSkuDailyPoints = useMemo(() => {
    if (!activeSelectedTrend) return [];
    return getSkuDailyHistory(
      activeSelectedTrend.generation,
      activeSelectedTrend.capacityGB,
      activeSelectedTrend.speedMTs,
      isDDR5_3DS(activeSelectedTrend)
    );
  }, [activeSelectedTrend, getSkuDailyHistory]);

  // Prepare chart data based on selected timeframe (Daily snapshots vs 90d milestone model)
  const activeSkuChartData = useMemo(() => {
    if (!activeSelectedTrend) return [];
    const t = activeSelectedTrend;
    const factor = chartMetric === 'pricePerGB' ? t.capacityGB : 1;

    // If Daily mode is selected and we have >= 2 daily snapshots, chart the actual daily trajectory
    if (chartTimeframe === 'daily' && activeSkuDailyPoints.length >= 2) {
      const totalPoints = activeSkuDailyPoints.length;
      return activeSkuDailyPoints.map((pt, idx) => {
        const dateObj = new Date(pt.iso || `${pt.date}T12:00:00Z`);
        const monthShort = dateObj.toLocaleDateString(language === 'zh-CN' ? 'zh-CN' : 'en-US', { month: 'short', timeZone: 'UTC' });
        const dayNum = dateObj.toLocaleDateString(language === 'zh-CN' ? 'zh-CN' : 'en-US', { day: '2-digit', timeZone: 'UTC' });
        const isToday = idx === totalPoints - 1;
        const is7dAgo = idx === Math.max(0, totalPoints - 8);

        const shortName = language === 'zh-CN' ? `${monthShort}${dayNum}日` : `${monthShort} ${dayNum}`;
        const timeline = isToday 
          ? (language === 'zh-CN' ? `${shortName} (今日)` : `${shortName} (Today)`)
          : is7dAgo 
          ? (language === 'zh-CN' ? `${shortName} (~7天前)` : `${shortName} (~7d ago)`)
          : shortName;

        return {
          timeline,
          shortName,
          date: pt.date,
          value: Number((pt.price / factor).toFixed(2)),
          rawPrice: pt.price,
          pricePerGB: Number((pt.price / t.capacityGB).toFixed(2)),
        };
      });
    }

    // 90-Day Milestone trajectory
    const price7d = t.avgPrice1WeekAgo || t.avgPrice1MoAgo;
    return [
      {
        timeline: language === 'zh-CN' ? '90天前' : '90 Days Ago',
        shortName: language === 'zh-CN' ? '90天前' : '90d Ago',
        value: Number((t.avgPrice3MoAgo / factor).toFixed(2)),
        rawPrice: t.avgPrice3MoAgo,
        pricePerGB: Number((t.avgPrice3MoAgo / t.capacityGB).toFixed(2)),
      },
      {
        timeline: language === 'zh-CN' ? '60天前' : '60 Days Ago',
        shortName: language === 'zh-CN' ? '60天前' : '60d Ago',
        value: Number((t.avgPrice2MoAgo / factor).toFixed(2)),
        rawPrice: t.avgPrice2MoAgo,
        pricePerGB: Number((t.avgPrice2MoAgo / t.capacityGB).toFixed(2)),
      },
      {
        timeline: language === 'zh-CN' ? '30天前' : '30 Days Ago',
        shortName: language === 'zh-CN' ? '30天前' : '30d Ago',
        value: Number((t.avgPrice1MoAgo / factor).toFixed(2)),
        rawPrice: t.avgPrice1MoAgo,
        pricePerGB: Number((t.avgPrice1MoAgo / t.capacityGB).toFixed(2)),
      },
      {
        timeline: language === 'zh-CN' ? '7天前' : '7 Days Ago',
        shortName: language === 'zh-CN' ? '7天前' : '7d Ago',
        value: Number((price7d / factor).toFixed(2)),
        rawPrice: price7d,
        pricePerGB: Number((price7d / t.capacityGB).toFixed(2)),
      },
      {
        timeline: language === 'zh-CN' ? '当前 (今日)' : 'Current (Today)',
        shortName: language === 'zh-CN' ? '今日' : 'Today',
        value: Number((t.currentAvgPrice / factor).toFixed(2)),
        rawPrice: t.currentAvgPrice,
        pricePerGB: Number((t.currentAvgPrice / t.capacityGB).toFixed(2)),
      }
    ];
  }, [activeSelectedTrend, chartMetric, chartTimeframe, activeSkuDailyPoints, language]);

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
                {language === 'zh-CN' ? '90天市场图形化走势' : '90-Day Graphical Market Trajectory'}
              </span>
              <span className="bg-slate-950 text-slate-300 border border-slate-800 px-3 py-0.5 rounded-full text-xs flex items-center gap-1.5 font-mono">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'zh-CN' ? '调研更新: ' : 'Research Update: '}<strong className="text-white font-semibold">{formatToTimezone(lastUpdatedTimestamp || metadata.isoTimestamp || "2026-09-04T02:57:22.498Z", selectedTimezone).dateString}</strong> {language === 'zh-CN' ? '时间' : 'at'} <strong className="text-amber-300 font-semibold">{formatToTimezone(lastUpdatedTimestamp || metadata.isoTimestamp || "2026-09-04T02:57:22.498Z", selectedTimezone).timeString}</strong></span>
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <span>{language === 'zh-CN' ? '90天估值走势与价格变化' : '90-Day Valuation Trajectories & Price Shifts'}</span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-2 max-w-3xl leading-relaxed">
              {language === 'zh-CN'
                ? '交互式历史价格曲线，追踪 DDR3、DDR4 和 DDR5 服务器 ECC 内存模组在 90 天内的价格动量（90天前 → 60天前 → 30天前 → 7天前 → 今日）。'
                : 'Interactive historical price curves tracking 90-day momentum (90d ago → 60d ago → 30d ago → 7d ago → Today) across DDR3, DDR4, and DDR5 server ECC memory modules.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setIsFormulaModalOpen(true)}
              className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white text-xs font-semibold transition-all border border-slate-800 shadow-xs cursor-pointer"
              title="View calculation formulas"
            >
              <Calculator className="w-3.5 h-3.5 text-indigo-400" />
              <span>{language === 'zh-CN' ? '计算公式指南' : 'Formulas Guide'}</span>
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
              {language === 'zh-CN' ? `全部代际 (${trends.length})` : `All Gens (${trends.length})`}
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
              {language === 'zh-CN' ? 'DDR5 单芯片' : 'DDR5 Monolithic'}
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

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Timeframe Mode Switcher */}
            {historicalSnapshots && historicalSnapshots.length > 0 && (
              <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                <button
                  onClick={() => setChartTimeframe('daily')}
                  className={`px-3 py-1.5 rounded font-medium transition-all flex items-center gap-1.5 ${
                    chartTimeframe === 'daily' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Plot actual daily historical snapshot records"
                >
                  <Activity className="w-3.5 h-3.5" />
                  {language === 'zh-CN' 
                    ? `每日快照记录 (${activeSkuDailyPoints.length > 0 ? `${activeSkuDailyPoints.length} 天` : '每日'})` 
                    : `Daily Snapshots (${activeSkuDailyPoints.length > 0 ? `${activeSkuDailyPoints.length} Days` : 'Daily'})`}
                </button>
                <button
                  onClick={() => setChartTimeframe('90day')}
                  className={`px-3 py-1.5 rounded font-medium transition-all flex items-center gap-1.5 ${
                    chartTimeframe === '90day' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="View 90-day macro momentum timeline"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  {language === 'zh-CN' ? '90天里程碑' : '90-Day Milestones'}
                </button>
              </div>
            )}

            {/* Metric Toggle: Price vs Price/GB */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setChartMetric('price')}
                className={`px-3 py-1.5 rounded font-medium transition-all flex items-center gap-1.5 ${
                  chartMetric === 'price' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                {language === 'zh-CN' ? '单条价格 ($)' : 'Unit Price ($)'}
              </button>
              <button
                onClick={() => setChartMetric('pricePerGB')}
                className={`px-3 py-1.5 rounded font-medium transition-all flex items-center gap-1.5 ${
                  chartMetric === 'pricePerGB' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                {language === 'zh-CN' ? '均价 $/GB' : 'Avg $/GB'}
              </button>
            </div>
          </div>
        </div>

        {/* 90-Day Momentum Summary Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              {language === 'zh-CN' ? '当前分类平均 90天变幅' : 'Filtered Category Avg 90d Shift'}
            </div>
            <div className={`text-base font-bold font-mono mt-1 flex items-center gap-1 ${
              marketSummaryStats.avgChange > 0 ? 'text-rose-400' : marketSummaryStats.avgChange < 0 ? 'text-emerald-400' : 'text-slate-300'
            }`}>
              {marketSummaryStats.avgChange > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{marketSummaryStats.avgChange > 0 ? `+${marketSummaryStats.avgChange.toFixed(1)}%` : `${marketSummaryStats.avgChange.toFixed(1)}%`}</span>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              {language === 'zh-CN' ? '下行走势 (降价)' : 'Downward Trajectory (Discounting)'}
            </div>
            <div className="text-base font-bold font-mono mt-1 text-emerald-400 flex items-center gap-1">
              <TrendingDown className="w-4 h-4" />
              <span>{marketSummaryStats.downCount} {language === 'zh-CN' ? '个规格' : 'SKUs'}</span>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              {language === 'zh-CN' ? '上行走势 (溢价)' : 'Upward Trajectory (Premiums)'}
            </div>
            <div className="text-base font-bold font-mono mt-1 text-rose-400 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              <span>{marketSummaryStats.upCount} {language === 'zh-CN' ? '个规格' : 'SKUs'}</span>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              {language === 'zh-CN' ? '平稳价格基准' : 'Stable Pricing Baseline'}
            </div>
            <div className="text-base font-bold font-mono mt-1 text-slate-300 flex items-center gap-1">
              <Minus className="w-4 h-4 text-slate-400" />
              <span>{marketSummaryStats.stableCount} {language === 'zh-CN' ? '个规格' : 'SKUs'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Focused Active SKU Detailed Area Chart Banner */}
      <div 
        ref={chartSectionRef}
        id="interactive-market-chart"
        className="bg-slate-900/50 rounded-xl border border-slate-800 p-5 shadow-sm space-y-4 scroll-mt-28 transition-all"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2 py-0.5 rounded font-bold text-[10px] font-mono uppercase ${
                activeSelectedTrend.generation === 'DDR3' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                activeSelectedTrend.generation === 'DDR4' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                isDDR5_3DS(activeSelectedTrend) ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {activeSelectedTrend.generation === 'DDR5' 
                  ? (isDDR5_3DS(activeSelectedTrend) ? 'DDR5 (3DS TSV)' : 'DDR5 (Mono 2Rx4)') 
                  : activeSelectedTrend.generation}
              </span>
              <h3 className="text-base font-bold text-white">
                {activeSelectedTrend.capacityGB}GB {activeSelectedTrend.speedMTs} MT/s {activeSelectedTrend.generation === 'DDR5' ? (isDDR5_3DS(activeSelectedTrend) ? '3DS' : 'Monolithic') : ''} {language === 'zh-CN' ? '历史走势' : 'Historical Trajectory'}
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              {activeSelectedTrend.analysisNotes}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3.5">
            {/* SKU Dropdown Selector */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-700/80 shadow-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <label htmlFor="sku-dropdown-selector" className="text-[11px] text-slate-300 font-medium whitespace-nowrap">
                {language === 'zh-CN' ? '选择规格:' : 'Choose SKU:'}
              </label>
              <select
                id="sku-dropdown-selector"
                value={getSkuKey(activeSelectedTrend)}
                onChange={(e) => setSelectedSkuKey(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-sky-300 hover:text-white font-mono text-xs rounded-md px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer max-w-[220px] sm:max-w-[300px] truncate"
                title={language === 'zh-CN' ? '选择想要查看图表走势的内存规格' : 'Select a memory SKU to view its historical chart'}
              >
                {groupedTrends.map((group) => {
                  if (group.items.length === 0) return null;
                  return (
                    <optgroup
                      key={group.key}
                      label={language === 'zh-CN' ? group.labelZh : group.label}
                      className="bg-slate-900 text-slate-400 font-semibold font-sans"
                    >
                      {group.items.map(t => {
                        const key = getSkuKey(t);
                        const changeSign = t.threeMonthChangePercent > 0 ? `+${t.threeMonthChangePercent}%` : `${t.threeMonthChangePercent}%`;
                        const typeSuffix = t.generation === 'DDR5' ? (isDDR5_3DS(t) ? ' (3DS TSV)' : ' (Mono 2Rx4)') : '';
                        return (
                          <option key={key} value={key} className="bg-slate-950 text-white font-mono py-0.5">
                            {t.generation} {t.capacityGB}GB {t.speedMTs} MT/s{typeSuffix} — ${t.currentAvgPrice.toFixed(2)} ({changeSign})
                          </option>
                        );
                      })}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400">
                  {language === 'zh-CN' ? '90天动量' : '90-Day Momentum'}
                </div>
                <div className={`text-base font-bold font-mono ${
                  activeSelectedTrend.threeMonthChangePercent > 0 ? 'text-rose-400' :
                  activeSelectedTrend.threeMonthChangePercent < 0 ? 'text-emerald-400' : 'text-slate-300'
                }`}>
                  {activeSelectedTrend.threeMonthChangePercent > 0 ? `+${activeSelectedTrend.threeMonthChangePercent}%` : `${activeSelectedTrend.threeMonthChangePercent}%`}
                </div>
              </div>
              <div className="h-8 w-px bg-slate-800"></div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400">
                  {language === 'zh-CN' ? '当前 eBay 均价' : 'Current eBay Avg'}
                </div>
                <div className="text-base font-bold font-mono text-sky-300">
                  ${activeSelectedTrend.currentAvgPrice.toFixed(2)}
                </div>
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
                  chartMetric === 'pricePerGB' ? (language === 'zh-CN' ? '每 GB 价格' : 'Price per GB') : (language === 'zh-CN' ? '标准化均价' : 'Normalized Avg Price')
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
            <span>{language === 'zh-CN' ? '90天前起始价: ' : '90d Ago Starting Price: '}<strong className="text-slate-300">${activeSelectedTrend.avgPrice3MoAgo.toFixed(2)}</strong></span>
            <span>{language === 'zh-CN' ? '底价 Floor: ' : 'Floor: '}<strong className="text-emerald-400">${activeSelectedTrend.lowestAskingCurrent.toFixed(2)}</strong></span>
            <span>{language === 'zh-CN' ? '高价 Ceiling: ' : 'Ceiling: '}<strong className="text-purple-300">${activeSelectedTrend.highestAskingCurrent.toFixed(2)}</strong></span>
            <span>{language === 'zh-CN' ? '均价 $/GB: ' : 'Avg $/GB: '}<strong className="text-indigo-300">${(activeSelectedTrend.currentAvgPrice / activeSelectedTrend.capacityGB).toFixed(2)}/GB</strong></span>
          </div>
          <div className="text-slate-400">
            {language === 'zh-CN' ? '点击下方任意卡片可在图表中深入查看' : 'Click any card below to focus its interactive chart'}
          </div>
        </div>
      </div>

      {/* Grid of Graphical SKU Sparkline Cards */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>{language === 'zh-CN' ? `全部规格图形化走势卡片 (${filteredTrends.length} 个规格)` : `All SKU Graphical Trajectory Cards (${filteredTrends.length} SKUs)`}</span>
          </h3>
          <span className="text-[11px] text-slate-400">
            {historicalSnapshots && historicalSnapshots.length >= 2
              ? (language === 'zh-CN' ? `走势线已与真实每日调研记录同步 (${historicalSnapshots.length} 个快照)` : `Sparklines synchronized with actual daily research records (${historicalSnapshots.length} snapshots)`)
              : (language === 'zh-CN' ? '走势线显示: 90天前 → 60天前 → 30天前 → 7天前 → 今日' : 'Sparklines represent 90d Ago → 60d Ago → 30d Ago → 7d Ago → Today')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredTrends.map((t, idx) => {
            const isDown = t.trendDirection === 'down';
            const isUp = t.trendDirection === 'up';
            const skuKey = getSkuKey(t);
            const isSelected = activeSelectedTrend && getSkuKey(activeSelectedTrend) === skuKey;

            // Extract real daily curve for this SKU if available in snapshots
            const dailyHistory = getSkuDailyHistory(t.generation, t.capacityGB, t.speedMTs, isDDR5_3DS(t));
            const sparkData = dailyHistory.length >= 2
              ? dailyHistory.map(p => ({ val: p.price, date: p.date }))
              : [
                  { val: t.avgPrice3MoAgo, date: '90d Ago' },
                  { val: t.avgPrice2MoAgo, date: '60d Ago' },
                  { val: t.avgPrice1MoAgo, date: '30d Ago' },
                  { val: t.avgPrice1WeekAgo || t.avgPrice1MoAgo, date: '7d Ago' },
                  { val: t.currentAvgPrice, date: 'Today' }
                ];

            const strokeColor = isDown ? '#10b981' : isUp ? '#f43f5e' : '#38bdf8';

            return (
              <div
                key={idx}
                onClick={() => handleSelectSku(skuKey)}
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
                        isDDR5_3DS(t) ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {t.generation === 'DDR5' ? (isDDR5_3DS(t) ? 'DDR5 3DS' : 'DDR5 Mono') : t.generation}
                      </span>
                      <span className="text-white font-bold text-sm font-mono">{t.capacityGB} GB</span>
                      <span className="text-slate-400 text-xs font-mono">{t.speedMTs} MT/s</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>{t.marketActivityLevel} {language === 'zh-CN' ? '活跃度' : 'Liquidity'}</span>
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
                        labelFormatter={(_, payload) => {
                          const item = payload?.[0]?.payload;
                          return item?.date ? item.date : '';
                        }}
                        formatter={(v: any) => [`$${Number(v).toFixed(2)}`, language === 'zh-CN' ? '均价' : 'Avg Price']}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Key Price Metrics Footer */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800/80 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">{language === 'zh-CN' ? '今日 eBay 均价:' : "Today's eBay Avg:"}</span>
                    <strong className="text-sky-300 text-sm font-bold">${t.currentAvgPrice.toFixed(2)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{language === 'zh-CN' ? '90天前基准:' : '90d Ago Baseline:'}</span>
                    <span className="text-slate-300">${t.avgPrice3MoAgo.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">{language === 'zh-CN' ? '底价 / 高价:' : 'Active Floor / Ceiling:'}</span>
                    <span className="text-slate-300">
                      <strong className="text-emerald-400">${t.lowestAskingCurrent.toFixed(2)}</strong> - <strong className="text-purple-300">${t.highestAskingCurrent.toFixed(2)}</strong>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-indigo-300 pt-0.5">
                    <span>{language === 'zh-CN' ? '均价 $/GB:' : 'Avg $/GB:'}</span>
                    <span>${(t.currentAvgPrice / t.capacityGB).toFixed(2)}/GB</span>
                  </div>
                </div>

                {/* Action footer */}
                <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500">
                  <span>{isSelected ? (language === 'zh-CN' ? '★ 当前已选中' : '★ Currently Selected') : (language === 'zh-CN' ? '点击在上方图表中查看' : 'Click to inspect in chart')}</span>
                  {onSelectSpec && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSpec(t.generation, t.capacityGB, t.speedMTs);
                      }}
                      className="text-sky-400 hover:text-sky-300 font-sans hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>{language === 'zh-CN' ? '在定价矩阵中查看' : 'View in Matrix'}</span>
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
