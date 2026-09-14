import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Download, 
  ExternalLink, 
  Filter, 
  Copy, 
  Check, 
  ArrowUpDown, 
  Layers, 
  Building2, 
  Tag, 
  CheckCircle2, 
  AlertCircle, 
  TrendingDown, 
  TrendingUp, 
  DollarSign, 
  ArrowDownRight, 
  ArrowUpRight, 
  Clock, 
  Calendar 
} from 'lucide-react';
import { RamListing, MemoryGeneration, MarketTrend, GenerationFilter } from '../types';
import { CURRENT_RESEARCH_METADATA, ResearchMetadata } from '../data/researchMetadata';
import { SupportedTimezone, formatToTimezone } from '../utils/timeFormat';
import { detectModuleType, extractMemoryRank } from '../utils/memoryClassification';
import { useLanguage } from '../context/LanguageContext';

interface ListingsTableProps {
  listings: RamListing[];
  selectedGeneration: GenerationFilter;
  onFilterGeneration: (gen: GenerationFilter) => void;
  metadata?: ResearchMetadata;
  catalogType?: 'liveEbay' | 'curatedBenchmark';
  trends?: MarketTrend[];
  selectedTimezone?: SupportedTimezone;
  lastUpdatedTimestamp?: string;
}

const TrendSparkline = ({ trend }: { trend: MarketTrend }) => {
  if (trend.threeMonthChangePercent === null || trend.threeMonthChangePercent === undefined) {
    return <span className="text-slate-500 font-mono text-xs font-semibold">N/A</span>;
  }
  const points = [
    trend.avgPrice3MoAgo,
    trend.avgPrice2MoAgo,
    trend.avgPrice1MoAgo,
    trend.currentAvgPrice
  ];
  
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1; // avoid division by zero
  const width = 48;
  const height = 16;
  
  // Normalize points to SVG coordinates
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p - min) / range) * height;
    return `${x},${y}`;
  });
  
  const pathData = `M ${coords.join(' L ')}`;
  const isUp = trend.threeMonthChangePercent > 0;
  const isDown = trend.threeMonthChangePercent < 0;
  
  // In ITAD, if price is going up it's typically green (value increase). 
  // If price drops it's red (depreciation).
  const colorClass = isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-slate-400';
  
  return (
    <div className="flex flex-col gap-1 items-end w-[60px]">
      <div className={`text-[10px] font-bold font-mono flex items-center gap-0.5 ${colorClass}`}>
        {isUp && <ArrowUpRight className="w-3 h-3" />}
        {isDown && <ArrowDownRight className="w-3 h-3" />}
        {!isUp && !isDown && <span className="mr-1">-</span>}
        {Math.abs(trend.threeMonthChangePercent).toFixed(1)}%
      </div>
      <svg width={width} height={height} className="overflow-visible">
        <path
          d={pathData}
          fill="none"
          className={`stroke-current ${colorClass}`}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

const OneWeekTrendBadge = ({ trend }: { trend: MarketTrend }) => {
  if (trend.oneWeekChangePercent === null || trend.oneWeekChangePercent === undefined) {
    return <span className="text-slate-500 font-mono text-xs font-semibold">N/A</span>;
  }
  const isUp = trend.oneWeekChangePercent > 0;
  const isDown = trend.oneWeekChangePercent < 0;
  const colorClass = isUp ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : isDown ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  
  return (
    <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-bold font-mono ${colorClass}`}>
      {isUp && <ArrowUpRight className="w-3 h-3" />}
      {isDown && <ArrowDownRight className="w-3 h-3" />}
      {!isUp && !isDown && <span className="px-1">-</span>}
      {Math.abs(trend.oneWeekChangePercent).toFixed(1)}%
    </div>
  );
};

export const ListingsTable: React.FC<ListingsTableProps> = ({
  listings,
  selectedGeneration = 'ALL',
  onFilterGeneration,
  metadata = CURRENT_RESEARCH_METADATA,
  catalogType = 'liveEbay',
  trends = [],
  selectedTimezone = 'Asia/Hong_Kong',
  lastUpdatedTimestamp,
}) => {
  const { language, t } = useLanguage();
  const [activeGen, setActiveGen] = useState<GenerationFilter>(selectedGeneration || 'ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCapacity, setSelectedCapacity] = useState<string>('ALL');
  const [selectedSpeed, setSelectedSpeed] = useState<string>('ALL');
  const [selectedVendor, setSelectedVendor] = useState<string>('ALL');
  const [onlyBulkLots, setOnlyBulkLots] = useState(false);
  const [priceTierFilter, setPriceTierFilter] = useState<'ALL' | 'LOWEST_ONLY' | 'HIGHEST_ONLY'>('ALL');
  const [sortField, setSortField] = useState<'pricePerUnit' | 'pricePerGB' | 'speedMTs' | 'capacityGB' | 'vendor'>('pricePerUnit');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Synchronize activeGen when parent selectedGeneration prop changes
  useEffect(() => {
    if (selectedGeneration !== undefined) {
      setActiveGen(selectedGeneration);
    }
  }, [selectedGeneration]);

  // Unified handler for switching generation
  const handleSetGeneration = (newGen: GenerationFilter) => {
    setActiveGen(newGen);
    // Reset secondary filters to prevent invalid cross-generation filter combinations
    setSelectedCapacity('ALL');
    setSelectedSpeed('ALL');
    if (onFilterGeneration) {
      onFilterGeneration(newGen);
    }
  };

  // Compute generation breakdown counts across the dataset
  const genCounts = useMemo(() => {
    let ddr3 = 0;
    let ddr4 = 0;
    let ddr5Mono = 0;
    let ddr53ds = 0;
    listings.forEach(item => {
      const modType = detectModuleType(item.title, item.capacityGB, item.generation, item.moduleType);
      const g = (item.generation || '').toUpperCase().trim();
      if (g === 'DDR3') {
        ddr3++;
      } else if (g === 'DDR4') {
        ddr4++;
      } else if (g === 'DDR5') {
        if (modType === '3DS RDIMM' || item.moduleType === '3DS RDIMM') {
          ddr53ds++;
        } else {
          ddr5Mono++;
        }
      }
    });
    return {
      ALL: listings.length,
      DDR3: ddr3,
      DDR4: ddr4,
      DDR5_MONO: ddr5Mono,
      DDR5_3DS: ddr53ds
    };
  }, [listings]);

  // Compute unique capacities available
  const capacityOptions = useMemo(() => {
    const set = new Set<number>();
    listings.forEach(l => {
      const g = (l.generation || '').toUpperCase().trim();
      if (
        activeGen === 'ALL' ||
        (activeGen === 'DDR5_MONO' && g === 'DDR5') ||
        (activeGen === 'DDR5_3DS' && g === 'DDR5') ||
        g === activeGen
      ) {
        if (l.capacityGB) set.add(l.capacityGB);
      }
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [listings, activeGen]);

  // Compute unique speeds available
  const speedOptions = useMemo(() => {
    const set = new Set<number>();
    listings.forEach(l => {
      const g = (l.generation || '').toUpperCase().trim();
      if (
        activeGen === 'ALL' ||
        (activeGen === 'DDR5_MONO' && g === 'DDR5') ||
        (activeGen === 'DDR5_3DS' && g === 'DDR5') ||
        g === activeGen
      ) {
        if (l.speedMTs) set.add(l.speedMTs);
      }
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [listings, activeGen]);

  // Compute unique vendors in the dataset
  const vendorOptions = useMemo(() => {
    const set = new Set<string>();
    listings.forEach(l => {
      if (l.vendor && l.vendor.trim() !== '') {
        set.add(l.vendor.trim());
      }
    });
    return Array.from(set).sort();
  }, [listings]);

  // Compute SKU-level lowest and highest prices across the entire catalog
  const skuPriceBounds = useMemo(() => {
    const map = new Map<string, { min: number; max: number }>();
    listings.forEach(item => {
      const key = `${item.generation}-${item.capacityGB}-${item.speedMTs}`;
      const current = map.get(key);
      if (!current) {
        map.set(key, { min: item.pricePerUnit, max: item.pricePerUnit });
      } else {
        if (item.pricePerUnit < current.min) current.min = item.pricePerUnit;
        if (item.pricePerUnit > current.max) current.max = item.pricePerUnit;
      }
    });
    return map;
  }, [listings]);

  // Filter & sort logic
  const filteredListings = useMemo(() => {
    return listings.filter(item => {
      const detectedModType = detectModuleType(item.title, item.capacityGB, item.generation, item.moduleType);
      const detectedRank = extractMemoryRank(item.title, item.capacityGB, item.generation, item.rank);
      const itemGen = (item.generation || '').toUpperCase().trim();

      // 1. Generation filter (Strict matching)
      if (activeGen && activeGen !== 'ALL') {
        if (activeGen === 'DDR3') {
          if (itemGen !== 'DDR3') return false;
        } else if (activeGen === 'DDR4') {
          if (itemGen !== 'DDR4') return false;
        } else if (activeGen === 'DDR5') {
          if (itemGen !== 'DDR5') return false;
        } else if (activeGen === 'DDR5_MONO') {
          if (itemGen !== 'DDR5') return false;
          // DDR5 Monolithic: must not be 3DS TSV stacked
          if (detectedModType === '3DS RDIMM' || item.moduleType === '3DS RDIMM') return false;
        } else if (activeGen === 'DDR5_3DS') {
          if (itemGen !== 'DDR5') return false;
          // DDR5 3DS: must be 3DS TSV stacked
          if (detectedModType !== '3DS RDIMM' && item.moduleType !== '3DS RDIMM') return false;
        } else if (itemGen !== activeGen) {
          return false;
        }
      }
      
      // 2. Capacity filter
      if (selectedCapacity !== 'ALL' && item.capacityGB !== Number(selectedCapacity)) {
        return false;
      }
      // 3. Speed filter
      if (selectedSpeed !== 'ALL' && item.speedMTs !== Number(selectedSpeed)) {
        return false;
      }
      // 4. Vendor filter
      if (selectedVendor !== 'ALL' && item.vendor !== selectedVendor) {
        return false;
      }
      // 5. Bulk lot filter
      if (onlyBulkLots && item.lotQuantity <= 1) {
        return false;
      }
      // 6. Lowest / Highest Price Tier Filter
      const skuKey = `${item.generation}-${item.capacityGB}-${item.speedMTs}`;
      const bounds = skuPriceBounds.get(skuKey);
      if (priceTierFilter === 'LOWEST_ONLY') {
        if (bounds && item.pricePerUnit > bounds.min) return false;
      }
      if (priceTierFilter === 'HIGHEST_ONLY') {
        if (bounds && item.pricePerUnit < bounds.max) return false;
      }

      // 7. Search keyword filter
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchPN = item.partNumber?.toLowerCase().includes(query) || false;
        const matchVendor = item.vendor.toLowerCase().includes(query);
        const matchModuleType = detectedModType.toLowerCase().includes(query);
        const matchRank = detectedRank.toLowerCase().includes(query);
        const matchNotes = item.notes?.toLowerCase().includes(query) || false;
        const matchStandard = item.speedStandard?.toLowerCase().includes(query) || false;
        if (!matchTitle && !matchPN && !matchVendor && !matchModuleType && !matchRank && !matchNotes && !matchStandard) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (sortField === 'vendor') {
        const aVal = a.vendor || '';
        const bVal = b.vendor || '';
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      let aVal = a[sortField] || 0;
      let bVal = b[sortField] || 0;
      if (sortField === 'pricePerGB') {
        aVal = a.pricePerUnit / a.capacityGB;
        bVal = b.pricePerUnit / b.capacityGB;
      }
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [listings, activeGen, selectedCapacity, selectedSpeed, selectedVendor, onlyBulkLots, priceTierFilter, searchTerm, sortField, sortDirection, skuPriceBounds]);

  // Overall statistics for current filtered view
  const currentViewStats = useMemo(() => {
    if (filteredListings.length === 0) return null;
    const prices = filteredListings.map(l => l.pricePerUnit);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const spread = maxPrice - minPrice;
    
    const lowestItem = filteredListings.find(l => l.pricePerUnit === minPrice);
    const highestItem = filteredListings.find(l => l.pricePerUnit === maxPrice);

    return {
      count: filteredListings.length,
      minPrice,
      maxPrice,
      avgPrice,
      spread,
      lowestItem,
      highestItem
    };
  }, [filteredListings]);

  const handleSort = (field: 'pricePerUnit' | 'pricePerGB' | 'speedMTs' | 'capacityGB' | 'vendor') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const copyPartNumber = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportCSV = () => {
    const headers = [
      'Generation',
      'Capacity (GB)',
      'Speed (MT/s)',
      'Speed Standard',
      'Module Type',
      'Rank',
      'Vendor',
      'Vendor Type',
      'Title',
      'Part Number',
      'Price Per Unit ($)',
      'Market Position',
      'Lot Quantity',
      'Total Lot Price ($)',
      'Price Per GB ($)',
      'Condition',
      'Tested',
      'Warranty',
      'Notes'
    ];

    const rows = filteredListings.map(l => {
      const skuKey = `${l.generation}-${l.capacityGB}-${l.speedMTs}`;
      const bounds = skuPriceBounds.get(skuKey);
      let position = 'Mid-Market';
      if (bounds && l.pricePerUnit === bounds.min) position = 'Lowest Floor';
      if (bounds && l.pricePerUnit === bounds.max) position = 'Highest Ceiling';

      return [
        l.generation,
        l.capacityGB,
        l.speedMTs,
        l.speedStandard,
        l.moduleType,
        l.rank,
        l.vendor,
        l.vendorType,
        `"${l.title.replace(/"/g, '""')}"`,
        l.partNumber || '',
        l.pricePerUnit.toFixed(2),
        position,
        l.lotQuantity,
        l.totalLotPrice ? l.totalLotPrice.toFixed(2) : l.pricePerUnit.toFixed(2),
        (l.pricePerUnit / l.capacityGB).toFixed(2),
        l.condition,
        l.testedWorking ? 'YES' : 'NO',
        l.warranty || '30 Days',
        `"${(l.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ITAD_Used_ECC_RAM_Prices_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Dynamic Catalog Type Banner */}
      {catalogType === 'liveEbay' ? (
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg shrink-0 mt-0.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse m-0.5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    {language === 'zh-CN' ? '全部要价与供应商 — eBay 实时数据流' : 'All Asking Prices & Vendors — Live eBay Feed'}
                  </h2>
                  <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    {language === 'zh-CN' ? '实时生产 API 数据流' : 'Live Production API Feed'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                  {language === 'zh-CN'
                    ? '通过官方 eBay Browse API 直接获取的 36 个服务器内存规格实时活跃挂牌。每条记录均包含真实卖家信息、按套条折算的单条单价以及直达 eBay 原贴的链接。'
                    : 'Real-time active marketplace listings retrieved directly from the official eBay Browse API across all 36 server memory SKUs. Each item includes live seller information, unit pricing normalized from multi-stick lots/kits, and direct links to the live eBay listing.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start md:self-auto shrink-0 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400">{language === 'zh-CN' ? '实时在售总数:' : 'Total Live Items:'}</span>
              <span className="text-xs font-mono font-bold text-emerald-400">{listings.length}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-indigo-500/30 rounded-xl p-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg shrink-0 mt-0.5">
                <Building2 className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    {language === 'zh-CN' ? '精选基准目录 — ITAD 企业级估值基准' : 'Curated Benchmark Catalog — ITAD Enterprise Baselines'}
                  </h2>
                  <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                    {language === 'zh-CN' ? '企业级多供应商指数' : 'Enterprise Multi-Vendor Index'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                  {language === 'zh-CN'
                    ? '标准化企业级内存估值基准，汇集自认证 ITAD 供应商与主要二手再制造渠道（ServerSupply、IT Creations、ServerMonkey、Memory4Less 及 OEM 渠道），覆盖全部 36 种规格。'
                    : 'Standardized enterprise memory valuation benchmarks compiled from certified ITAD suppliers and primary secondary-market refurbishers (ServerSupply, IT Creations, ServerMonkey, Memory4Less, and OEM channels) covering all 36 capacity and frequency specifications.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start md:self-auto shrink-0 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400">{language === 'zh-CN' ? '精选基准总数:' : 'Curated Benchmarks:'}</span>
              <span className="text-xs font-mono font-bold text-indigo-400">{listings.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* ITAD Inventory Valuation Summary Banner */}
      {currentViewStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Lowest (Floor) Card */}
          <div className="bg-slate-900/60 rounded-xl p-4 border border-emerald-500/30 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                {language === 'zh-CN' ? '🟢 最低二手价 (底价 Floor)' : '🟢 Lowest Used Price (Floor)'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {currentViewStats.lowestItem?.vendor}
              </span>
            </div>
            <div className="mt-1 text-2xl font-bold text-emerald-400 font-mono">
              ${currentViewStats.minPrice.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 truncate">
              {currentViewStats.lowestItem?.generation} {currentViewStats.lowestItem?.capacityGB}GB {currentViewStats.lowestItem?.speedMTs} MT/s ({currentViewStats.lowestItem?.condition})
            </div>
          </div>

          {/* Highest (Ceiling) Card */}
          <div className="bg-slate-900/60 rounded-xl p-4 border border-purple-500/30 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400">
                {language === 'zh-CN' ? '🟣 最高二手价 (高价 Ceiling)' : '🟣 Highest Used Price (Ceiling)'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {currentViewStats.highestItem?.vendor}
              </span>
            </div>
            <div className="mt-1 text-2xl font-bold text-purple-300 font-mono">
              ${currentViewStats.maxPrice.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 truncate">
              {currentViewStats.highestItem?.generation} {currentViewStats.highestItem?.capacityGB}GB {currentViewStats.highestItem?.speedMTs} MT/s ({currentViewStats.highestItem?.condition})
            </div>
          </div>

          {/* Market Average Card */}
          <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-sky-400">
                {language === 'zh-CN' ? '⚖️ 当前市场均价' : '⚖️ Current Market Average'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {currentViewStats.count} {language === 'zh-CN' ? '条在售' : 'listings'}
              </span>
            </div>
            <div className="mt-1 text-2xl font-bold text-sky-300 font-mono">
              ${currentViewStats.avgPrice.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {language === 'zh-CN' ? '多供应商加权市场基准' : 'Weighted cross-vendor baseline'}
            </div>
          </div>

          {/* Realization Spread Card */}
          <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                {language === 'zh-CN' ? '📊 ITAD 毛价差' : '📊 Gross ITAD Spread'}
              </span>
              <span className="text-[10px] text-amber-400/80 font-mono">
                {language === 'zh-CN' ? '底价 → 高价' : 'Floor → Ceiling'}
              </span>
            </div>
            <div className="mt-1 text-2xl font-bold text-amber-300 font-mono">
              +${currentViewStats.spread.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {currentViewStats.minPrice > 0 
                ? (language === 'zh-CN' 
                    ? `+${((currentViewStats.spread / currentViewStats.minPrice) * 100).toFixed(0)}% 利润空间` 
                    : `+${((currentViewStats.spread / currentViewStats.minPrice) * 100).toFixed(0)}% margin potential`)
                : (language === 'zh-CN' ? '套利窗口' : 'Arbitrage window')}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar Card */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={language === 'zh-CN' ? '按部件号(如 M393A, HMA84)、型号、OEM 或标题搜索...' : 'Search by Part No (e.g. M393A, HMA84), model, Dell/HP OEM, or title...'}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* Export and Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{language === 'zh-CN' ? '更新时间: ' : 'Research: '}<strong className="text-white">{formatToTimezone(lastUpdatedTimestamp || metadata.isoTimestamp || "2026-09-04T02:57:22.498Z", selectedTimezone).dateString}</strong> • <strong className="text-amber-300">{formatToTimezone(lastUpdatedTimestamp || metadata.isoTimestamp || "2026-09-04T02:57:22.498Z", selectedTimezone).timeString}</strong> <span className="text-slate-500">({formatToTimezone(lastUpdatedTimestamp || metadata.isoTimestamp || "2026-09-04T02:57:22.498Z", selectedTimezone).tzOffsetLabel} {formatToTimezone(lastUpdatedTimestamp || metadata.isoTimestamp || "2026-09-04T02:57:22.498Z", selectedTimezone).tzBadge})</span></span>
            </div>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-lg transition-colors border border-slate-700 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              {language === 'zh-CN' ? `导出 CSV (${filteredListings.length})` : `Export ITAD CSV (${filteredListings.length})`}
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex flex-col gap-3 text-xs">
          {/* Top Row: Generation Segmented Selector */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 font-semibold text-[11px] mr-1">{language === 'zh-CN' ? '代际筛选:' : 'Generation:'}</span>
              
              <button
                type="button"
                onClick={() => handleSetGeneration('ALL')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeGen === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-400'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 hover:bg-slate-900'
                }`}
              >
                <span>{language === 'zh-CN' ? '全部代际' : 'All Gens'}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeGen === 'ALL' ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {genCounts.ALL}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSetGeneration('DDR3')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeGen === 'DDR3'
                    ? 'bg-amber-600 text-white shadow-xs ring-1 ring-amber-400'
                    : 'bg-slate-950 text-amber-400 hover:text-amber-300 border border-slate-800 hover:bg-slate-900'
                }`}
              >
                <span>DDR3</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeGen === 'DDR3' ? 'bg-amber-700 text-white' : 'bg-slate-800 text-amber-400/80'
                }`}>
                  {genCounts.DDR3}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSetGeneration('DDR4')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeGen === 'DDR4'
                    ? 'bg-sky-600 text-white shadow-xs ring-1 ring-sky-400'
                    : 'bg-slate-950 text-sky-400 hover:text-sky-300 border border-slate-800 hover:bg-slate-900'
                }`}
              >
                <span>DDR4</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeGen === 'DDR4' ? 'bg-sky-700 text-white' : 'bg-slate-800 text-sky-400/80'
                }`}>
                  {genCounts.DDR4}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSetGeneration('DDR5_MONO')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeGen === 'DDR5_MONO'
                    ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-400'
                    : 'bg-slate-950 text-emerald-400 hover:text-emerald-300 border border-slate-800 hover:bg-slate-900'
                }`}
              >
                <span>{language === 'zh-CN' ? 'DDR5 (单芯片 Mono)' : 'DDR5 (Monolithic)'}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeGen === 'DDR5_MONO' ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-emerald-400/80'
                }`}>
                  {genCounts.DDR5_MONO}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSetGeneration('DDR5_3DS')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeGen === 'DDR5_3DS'
                    ? 'bg-rose-600 text-white shadow-xs ring-1 ring-rose-400'
                    : 'bg-slate-950 text-rose-400 hover:text-rose-300 border border-slate-800 hover:bg-slate-900'
                }`}
              >
                <span>{language === 'zh-CN' ? 'DDR5 (3DS 堆叠)' : 'DDR5 (3DS TSV)'}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeGen === 'DDR5_3DS' ? 'bg-rose-700 text-white' : 'bg-slate-800 text-rose-400/80'
                }`}>
                  {genCounts.DDR5_3DS}
                </span>
              </button>
            </div>

            {/* Bulk Lot Checkbox */}
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 font-medium text-xs">
              <input
                type="checkbox"
                checked={onlyBulkLots}
                onChange={(e) => setOnlyBulkLots(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-800"
              />
              {language === 'zh-CN' ? '仅显示批量/托盘挂牌 (Lot/Tray)' : 'Show Bulk Tray / Lot Listings Only'}
            </label>
          </div>

          {/* Bottom Row: Secondary Filters (Price Tier, Capacity, Speed, Vendor, Reset) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Generation Quick Dropdown */}
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-md px-2 py-1">
                <span className="text-slate-400 font-medium text-[11px]">{language === 'zh-CN' ? '代际:' : 'Gen:'}</span>
                <select
                  value={activeGen}
                  onChange={(e) => handleSetGeneration(e.target.value as GenerationFilter)}
                  className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer pr-1"
                >
                  <option value="ALL" className="bg-slate-900 text-slate-200">{language === 'zh-CN' ? `全部代际 (${genCounts.ALL})` : `All Generations (${genCounts.ALL})`}</option>
                  <option value="DDR3" className="bg-slate-900 text-amber-400">DDR3 ({genCounts.DDR3})</option>
                  <option value="DDR4" className="bg-slate-900 text-sky-400">DDR4 ({genCounts.DDR4})</option>
                  <option value="DDR5_MONO" className="bg-slate-900 text-emerald-400">DDR5 Monolithic ({genCounts.DDR5_MONO})</option>
                  <option value="DDR5_3DS" className="bg-slate-900 text-rose-400">DDR5 3DS TSV ({genCounts.DDR5_3DS})</option>
                </select>
              </div>

              {/* Price Tier Toggle */}
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setPriceTierFilter('ALL')}
                  className={`px-2 py-1 text-[11px] font-semibold rounded ${
                    priceTierFilter === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {language === 'zh-CN' ? '全部价格' : 'All Prices'}
                </button>
                <button
                  onClick={() => setPriceTierFilter('LOWEST_ONLY')}
                  className={`px-2 py-1 text-[11px] font-semibold rounded flex items-center gap-1 ${
                    priceTierFilter === 'LOWEST_ONLY'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-emerald-400'
                  }`}
                >
                  <span>{language === 'zh-CN' ? '🟢 最低 (底价)' : '🟢 Lowest'}</span>
                </button>
                <button
                  onClick={() => setPriceTierFilter('HIGHEST_ONLY')}
                  className={`px-2 py-1 text-[11px] font-semibold rounded flex items-center gap-1 ${
                    priceTierFilter === 'HIGHEST_ONLY'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-purple-300'
                  }`}
                >
                  <span>{language === 'zh-CN' ? '🟣 最高 (高价)' : '🟣 Highest'}</span>
                </button>
              </div>

              {/* Capacity Dropdown Filter */}
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-md px-2 py-1">
                <span className="text-slate-400 font-medium text-[11px]">{language === 'zh-CN' ? '容量:' : 'Cap:'}</span>
                <select
                  value={selectedCapacity}
                  onChange={(e) => setSelectedCapacity(e.target.value)}
                  className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer pr-1"
                >
                  <option value="ALL" className="bg-slate-900 text-slate-200">{language === 'zh-CN' ? '全部容量' : 'All Capacities'}</option>
                  {capacityOptions.map(c => (
                    <option key={c} value={c} className="bg-slate-900 text-slate-200">{c}GB</option>
                  ))}
                </select>
              </div>

              {/* Speed Dropdown Filter */}
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-md px-2 py-1">
                <span className="text-slate-400 font-medium text-[11px]">{language === 'zh-CN' ? '频率:' : 'Speed:'}</span>
                <select
                  value={selectedSpeed}
                  onChange={(e) => setSelectedSpeed(e.target.value)}
                  className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer pr-1"
                >
                  <option value="ALL" className="bg-slate-900 text-slate-200">{language === 'zh-CN' ? '全部频率' : 'All Speeds'}</option>
                  {speedOptions.map(s => (
                    <option key={s} value={s} className="bg-slate-900 text-slate-200">{s} MT/s</option>
                  ))}
                </select>
              </div>

              {/* Vendor Filter (Curated Benchmark Catalog Only) */}
              {catalogType === 'curatedBenchmark' && vendorOptions.length > 1 && (
                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-md px-2 py-1">
                  <span className="text-slate-400 font-medium text-[11px]">{language === 'zh-CN' ? '供应商:' : 'Vendor:'}</span>
                  <select
                    value={selectedVendor}
                    onChange={(e) => setSelectedVendor(e.target.value)}
                    className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer max-w-[150px] truncate"
                  >
                    <option value="ALL" className="bg-slate-900 text-slate-200">{language === 'zh-CN' ? `全部 (${vendorOptions.length})` : `All (${vendorOptions.length})`}</option>
                    {vendorOptions.map(v => (
                      <option key={v} value={v} className="bg-slate-900 text-slate-200">{v}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Reset All Filters Button */}
            {(activeGen !== 'ALL' || selectedCapacity !== 'ALL' || selectedSpeed !== 'ALL' || selectedVendor !== 'ALL' || priceTierFilter !== 'ALL' || onlyBulkLots || searchTerm.trim() !== '') && (
              <button
                onClick={() => {
                  handleSetGeneration('ALL');
                  setSelectedCapacity('ALL');
                  setSelectedSpeed('ALL');
                  setSelectedVendor('ALL');
                  setPriceTierFilter('ALL');
                  setOnlyBulkLots(false);
                  setSearchTerm('');
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium cursor-pointer"
              >
                {language === 'zh-CN' ? '重置所有筛选' : 'Reset All Filters'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active Filter State Summary Banner */}
      {activeGen !== 'ALL' && (
        <div className="flex items-center justify-between bg-slate-900/90 border border-indigo-500/30 px-3.5 py-2 rounded-lg text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">
              {language === 'zh-CN' ? '当前已筛选代际:' : 'Active Generation Filter:'}
            </span>
            <span className={`px-2 py-0.5 rounded font-bold font-mono text-[11px] ${
              activeGen === 'DDR3' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
              activeGen === 'DDR4' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
              activeGen === 'DDR5_MONO' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
              activeGen === 'DDR5_3DS' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
              'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
            }`}>
              {activeGen === 'DDR3' ? 'DDR3 Registered ECC' :
               activeGen === 'DDR4' ? 'DDR4 Registered ECC' :
               activeGen === 'DDR5_MONO' ? 'DDR5 Monolithic (2Rx4)' :
               activeGen === 'DDR5_3DS' ? 'DDR5 3DS TSV Stacked' : activeGen}
            </span>
            <span className="text-slate-400 text-[11px]">
              ({language === 'zh-CN' ? `显示 ${filteredListings.length} 条记录，共 ${listings.length} 条` : `Showing ${filteredListings.length} of ${listings.length} listings`})
            </span>
          </div>
          <button
            onClick={() => handleSetGeneration('ALL')}
            className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
          >
            {language === 'zh-CN' ? '显示全部代际 (Clear Filter)' : 'Show All Generations'}
          </button>
        </div>
      )}

      {/* Main Data Table */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[10px]">
                <th className="py-3 px-3 whitespace-nowrap">{language === 'zh-CN' ? '代际' : 'Gen'}</th>
                <th 
                  onClick={() => handleSort('capacityGB')}
                  className="py-3 px-3 cursor-pointer hover:text-white whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    {language === 'zh-CN' ? '容量' : 'Capacity'}
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('speedMTs')}
                  className="py-3 px-3 cursor-pointer hover:text-white whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    {language === 'zh-CN' ? '频率 / 标准' : 'Speed / Standard'}
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">{language === 'zh-CN' ? '模组类型' : 'Module Type'}</th>
                <th className="py-3 px-3 whitespace-nowrap">{language === 'zh-CN' ? 'Rank 规格' : 'Rank'}</th>
                <th className="py-3 px-3 whitespace-nowrap">{language === 'zh-CN' ? '部件号 / 型号' : 'Part Number / Model'}</th>
                {catalogType === 'curatedBenchmark' && (
                  <th 
                    onClick={() => handleSort('vendor')}
                    className="py-3 px-3 cursor-pointer hover:text-white whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      {language === 'zh-CN' ? '供应商' : 'Vendor'}
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                )}
                <th className="py-3 px-3 whitespace-nowrap">{language === 'zh-CN' ? '批量数量' : 'Lot Qty'}</th>
                <th 
                  onClick={() => handleSort('pricePerUnit')}
                  className="py-3 px-3 cursor-pointer hover:text-white whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    {language === 'zh-CN' ? '单价 ($) / 位置' : 'Unit Price ($) / Position'}
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('pricePerGB')}
                  className="py-3 px-3 cursor-pointer hover:text-white whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    {language === 'zh-CN' ? '每 GB 费率' : '$/GB Rate'}
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">{language === 'zh-CN' ? '成色与测试' : 'Condition & Testing'}</th>
                {catalogType === 'curatedBenchmark' ? (
                  <>
                    <th className="py-3 px-3 whitespace-nowrap">{language === 'zh-CN' ? '1周趋势' : '1-Week Trend'}</th>
                    <th className="py-3 px-3 whitespace-nowrap">{language === 'zh-CN' ? '90天走势' : '90-Day Trend'}</th>
                  </>
                ) : (
                  <th className="py-3 px-3 text-right whitespace-nowrap">
                    {language === 'zh-CN' ? '操作' : 'Listing Action'}
                  </th>
                )}
              </tr>
            </thead>
            <tbody key={activeGen} className="divide-y divide-slate-800/60">
              {filteredListings.length === 0 ? (
                <tr>
                  <td colSpan={catalogType === 'curatedBenchmark' ? 13 : 11} className="py-8 text-center text-slate-500">
                    {language === 'zh-CN' ? '暂无符合所选筛选条件的记录。' : 'No memory listings match your selected filter criteria.'}
                  </td>
                </tr>
              ) : (
                filteredListings.map((item, idx) => {
                  const effectiveModType = detectModuleType(item.title, item.capacityGB, item.generation, item.moduleType);
                  const effectiveRank = extractMemoryRank(item.title, item.capacityGB, item.generation, item.rank);
                  const pricePerGB = item.pricePerUnit / item.capacityGB;
                  const skuKey = `${item.generation}-${item.capacityGB}-${item.speedMTs}`;
                  const bounds = skuPriceBounds.get(skuKey);
                  const isLowest = bounds && item.pricePerUnit === bounds.min;
                  const isHighest = bounds && item.pricePerUnit === bounds.max;
                  const itemTrend = trends.find(t => t.generation === item.generation && t.capacityGB === item.capacityGB && t.speedMTs === item.speedMTs);

                  return (
                    <tr key={`${item.id}-${item.generation}-${idx}`} className="hover:bg-slate-800/30 transition-colors">
                      {/* Generation Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] uppercase font-mono ${
                          item.generation === 'DDR3' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          item.generation === 'DDR4' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {item.generation === 'DDR5' 
                            ? (effectiveModType === '3DS RDIMM' ? 'DDR5 (3DS)' : 'DDR5 (Mono)') 
                            : item.generation}
                        </span>
                      </td>

                      {/* Capacity */}
                      <td className="py-3 px-3 font-bold text-white font-mono whitespace-nowrap">
                        {item.capacityGB} GB
                        {(item.capacityGB === 24 || item.capacityGB === 48 || item.capacityGB === 96) && (
                          <span className="ml-1 text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1 py-0.2 rounded font-sans">
                            {language === 'zh-CN' ? '非二进制' : 'Non-Bin'}
                          </span>
                        )}
                        {effectiveModType === '3DS RDIMM' && (
                          <span className="ml-1 text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1 py-0.2 rounded font-sans">
                            3DS
                          </span>
                        )}
                      </td>

                      {/* Speed & Standard */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-200 font-mono">
                          {item.speedMTs} MT/s
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {item.speedStandard}
                        </div>
                      </td>

                      {/* Module Type */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded font-mono text-[11px] font-semibold ${
                          effectiveModType === '3DS RDIMM' 
                            ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' 
                            : effectiveModType === 'LRDIMM'
                            ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                            : 'bg-slate-800/80 text-slate-200 border border-slate-700/60'
                        }`}>
                          {effectiveModType}
                        </span>
                      </td>

                      {/* Rank */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-mono text-slate-300 text-xs font-semibold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {effectiveRank}
                        </span>
                      </td>

                      {/* Part Number */}
                      <td className="py-3 px-3">
                        {item.partNumber ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-indigo-300 font-medium">
                              {item.partNumber}
                            </span>
                            <button
                              onClick={() => copyPartNumber(item.partNumber!, item.id)}
                              className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                              title={language === 'zh-CN' ? '复制部件号' : 'Copy OEM Part Number'}
                            >
                              {copiedId === item.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">{language === 'zh-CN' ? 'OEM 等效' : 'OEM Equivalent'}</span>
                        )}
                        <div className="text-[11px] text-slate-400 truncate max-w-[220px]" title={item.title}>
                          {item.title}
                        </div>
                      </td>

                      {/* Vendor (Curated Benchmark Catalog Only) */}
                      {catalogType === 'curatedBenchmark' && (
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-200">
                              {item.vendor || (language === 'zh-CN' ? '企业级 ITAD' : 'Enterprise ITAD')}
                            </span>
                            {item.sourceUrl && (
                              <a
                                href={item.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-indigo-400 p-0.5 transition-colors"
                                title={`View ${item.vendor} source listing in new tab`}
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          {item.vendorType && (
                            <div className="text-[10px] text-slate-500 font-mono">
                              {item.vendorType}
                            </div>
                          )}
                        </td>
                      )}

                      {/* Lot Qty */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {item.lotQuantity > 1 ? (
                          <div>
                            <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold px-1.5 py-0.5 rounded text-[10px]">
                              {language === 'zh-CN' ? `批量 ${item.lotQuantity} 根` : `Lot of ${item.lotQuantity}`}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              ${item.totalLotPrice?.toFixed(2)} {language === 'zh-CN' ? '总计' : 'tot'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500">{language === 'zh-CN' ? '单条 (1根)' : 'Single (1x)'}</span>
                        )}
                      </td>

                      {/* Price Per Unit & ITAD Position Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-bold text-white font-mono">
                            ${item.pricePerUnit.toFixed(2)}
                          </div>
                          {isLowest && (
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider font-mono">
                              {language === 'zh-CN' ? '最低底价' : 'Floor Low'}
                            </span>
                          )}
                          {isHighest && (
                            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider font-mono">
                              {language === 'zh-CN' ? '最高售价' : 'Ceiling High'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Price Per GB */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono text-[11px]">
                          ${pricePerGB.toFixed(2)}/GB
                        </span>
                      </td>

                      {/* Condition & Tested */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="text-slate-300 font-medium flex items-center gap-1">
                          {item.testedWorking ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          {item.condition}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {item.warranty || (language === 'zh-CN' ? '30天保修' : '30-Day Warranty')}
                        </div>
                      </td>

                      {/* Trends (Curated Benchmark only) */}
                      {catalogType === 'curatedBenchmark' && (
                        <>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {itemTrend && itemTrend.oneWeekChangePercent !== null && itemTrend.oneWeekChangePercent !== undefined ? (
                              <OneWeekTrendBadge trend={itemTrend} />
                            ) : (
                              <span className="text-slate-500 font-mono text-xs font-semibold">N/A</span>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {itemTrend && itemTrend.threeMonthChangePercent !== null && itemTrend.threeMonthChangePercent !== undefined ? (
                              <TrendSparkline trend={itemTrend} />
                            ) : (
                              <span className="text-slate-500 font-mono text-xs font-semibold">N/A</span>
                            )}
                          </td>
                        </>
                      )}

                      {/* Listing Action / Direct Link (Live eBay Marketplace only) */}
                      {catalogType !== 'curatedBenchmark' && (
                        <td className="py-3 px-3 whitespace-nowrap text-right">
                          {item.sourceUrl ? (
                            <a
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 bg-slate-800/90 hover:bg-indigo-600 text-slate-300 hover:text-white px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border border-slate-700 hover:border-indigo-400 shadow-xs group cursor-pointer"
                              title={language === 'zh-CN' ? '在 eBay 新标签页中打开' : 'Open live eBay listing in a new tab'}
                            >
                              <span>{language === 'zh-CN' ? '查看 eBay' : 'View on eBay'}</span>
                              <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-white transition-colors" />
                            </a>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
