import React, { useState, useMemo } from 'react';
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
import { RamListing, MemoryGeneration } from '../types';
import { CURRENT_RESEARCH_METADATA, ResearchMetadata } from '../data/researchMetadata';

interface ListingsTableProps {
  listings: RamListing[];
  selectedGeneration: MemoryGeneration | 'ALL';
  onFilterGeneration: (gen: MemoryGeneration | 'ALL') => void;
  metadata?: ResearchMetadata;
  catalogType?: 'liveEbay' | 'curatedBenchmark';
}

export const ListingsTable: React.FC<ListingsTableProps> = ({
  listings,
  selectedGeneration,
  onFilterGeneration,
  metadata = CURRENT_RESEARCH_METADATA,
  catalogType = 'liveEbay',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<string>('ALL');
  const [selectedCapacity, setSelectedCapacity] = useState<string>('ALL');
  const [selectedSpeed, setSelectedSpeed] = useState<string>('ALL');
  const [onlyBulkLots, setOnlyBulkLots] = useState(false);
  const [priceTierFilter, setPriceTierFilter] = useState<'ALL' | 'LOWEST_ONLY' | 'HIGHEST_ONLY'>('ALL');
  const [sortField, setSortField] = useState<'pricePerUnit' | 'pricePerGB' | 'speedMTs' | 'capacityGB'>('pricePerUnit');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Extract unique vendors
  const allVendors = useMemo(() => {
    return Array.from(new Set(listings.map(l => l.vendor))).sort();
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
      // Generation filter
      if (selectedGeneration !== 'ALL') {
        if (selectedGeneration === 'DDR5_MONO') {
          if (item.generation !== 'DDR5' || item.moduleType === '3DS RDIMM') return false;
        } else if (selectedGeneration === 'DDR5_3DS') {
          if (item.generation !== 'DDR5' || item.moduleType !== '3DS RDIMM') return false;
        } else if (item.generation !== selectedGeneration) {
          return false;
        }
      }
      
      // Vendor filter
      if (selectedVendor !== 'ALL' && item.vendor !== selectedVendor) {
        return false;
      }
      // Capacity filter
      if (selectedCapacity !== 'ALL' && item.capacityGB !== Number(selectedCapacity)) {
        return false;
      }
      // Speed filter
      if (selectedSpeed !== 'ALL' && item.speedMTs !== Number(selectedSpeed)) {
        return false;
      }
      // Bulk lot filter
      if (onlyBulkLots && item.lotQuantity <= 1) {
        return false;
      }
      // Lowest / Highest Price Tier Filter
      const skuKey = `${item.generation}-${item.capacityGB}-${item.speedMTs}`;
      const bounds = skuPriceBounds.get(skuKey);
      if (priceTierFilter === 'LOWEST_ONLY') {
        if (bounds && item.pricePerUnit > bounds.min) return false;
      }
      if (priceTierFilter === 'HIGHEST_ONLY') {
        if (bounds && item.pricePerUnit < bounds.max) return false;
      }

      // Search keyword filter
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchPN = item.partNumber?.toLowerCase().includes(query) || false;
        const matchVendor = item.vendor.toLowerCase().includes(query);
        const matchNotes = item.notes?.toLowerCase().includes(query) || false;
        const matchStandard = item.speedStandard?.toLowerCase().includes(query) || false;
        if (!matchTitle && !matchPN && !matchVendor && !matchNotes && !matchStandard) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
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
  }, [listings, selectedGeneration, selectedVendor, selectedCapacity, selectedSpeed, onlyBulkLots, priceTierFilter, searchTerm, sortField, sortDirection, skuPriceBounds]);

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

  const handleSort = (field: 'pricePerUnit' | 'pricePerGB' | 'speedMTs' | 'capacityGB') => {
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
                    All Asking Prices & Vendors — Live eBay Feed
                  </h2>
                  <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Live Production API Feed
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                  Real-time active marketplace listings retrieved directly from the official eBay Browse API across all 36 server memory SKUs. Each item includes live seller information, unit pricing normalized from multi-stick lots/kits, and direct links to the live eBay listing.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start md:self-auto shrink-0 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400">Total Live Items:</span>
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
                    Curated Benchmark Catalog — ITAD Enterprise Baselines
                  </h2>
                  <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                    Enterprise Multi-Vendor Index
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                  Standardized enterprise memory valuation benchmarks compiled from certified ITAD suppliers and primary secondary-market refurbishers (ServerSupply, CloudNinja, Memory.NET, IT Creations, and OEM channels) covering all 36 capacity and frequency specifications.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start md:self-auto shrink-0 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400">Curated Benchmarks:</span>
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
                🟢 Lowest Used Price (Floor)
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
                🟣 Highest Used Price (Ceiling)
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
                ⚖️ Current Market Average
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {currentViewStats.count} listings
              </span>
            </div>
            <div className="mt-1 text-2xl font-bold text-sky-300 font-mono">
              ${currentViewStats.avgPrice.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Weighted cross-vendor baseline
            </div>
          </div>

          {/* Realization Spread Card */}
          <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                📊 Gross ITAD Spread
              </span>
              <span className="text-[10px] text-amber-400/80 font-mono">
                Floor → Ceiling
              </span>
            </div>
            <div className="mt-1 text-2xl font-bold text-amber-300 font-mono">
              +${currentViewStats.spread.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {currentViewStats.minPrice > 0 
                ? `+${((currentViewStats.spread / currentViewStats.minPrice) * 100).toFixed(0)}% margin potential`
                : 'Arbitrage window'}
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
              placeholder="Search by Part No (e.g. M393A, HMA84), model, Dell/HP OEM, or title..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* Export and Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Research: <strong className="text-white">{metadata.lastUpdatedDay}, {metadata.lastUpdatedDate}</strong> • <strong className="text-amber-300">{metadata.lastUpdatedTime}</strong> <span className="text-slate-500">({metadata.timezone})</span></span>
            </div>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-lg transition-colors border border-slate-700 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              Export ITAD CSV ({filteredListings.length})
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Price Tier Toggle */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setPriceTierFilter('ALL')}
                className={`px-2.5 py-1 text-xs font-semibold rounded ${
                  priceTierFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Prices
              </button>
              <button
                onClick={() => setPriceTierFilter('LOWEST_ONLY')}
                className={`px-2.5 py-1 text-xs font-semibold rounded flex items-center gap-1 ${
                  priceTierFilter === 'LOWEST_ONLY'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-emerald-400'
                }`}
              >
                <span>🟢 Lowest (Floors)</span>
              </button>
              <button
                onClick={() => setPriceTierFilter('HIGHEST_ONLY')}
                className={`px-2.5 py-1 text-xs font-semibold rounded flex items-center gap-1 ${
                  priceTierFilter === 'HIGHEST_ONLY'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-purple-300'
                }`}
              >
                <span>🟣 Highest (Ceilings)</span>
              </button>
            </div>

            {/* Generation */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium text-[11px]">Gen:</span>
              <select
                value={selectedGeneration}
                onChange={(e) => onFilterGeneration(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-slate-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All Gens (DDR3/4/5)</option>
                <option value="DDR3">DDR3</option>
                <option value="DDR4">DDR4</option>
                <option value="DDR5_MONO">DDR5 Monolithic</option>
                <option value="DDR5_3DS">DDR5 3DS</option>
              </select>
            </div>

            {/* Vendor */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium text-[11px]">Vendor:</span>
              <select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-slate-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All Vendors</option>
                {allVendors.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bulk Lot Checkbox */}
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 font-medium text-xs">
            <input
              type="checkbox"
              checked={onlyBulkLots}
              onChange={(e) => setOnlyBulkLots(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-800"
            />
            Show Bulk Tray / Lot Listings Only
          </label>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[10px]">
                <th className="py-3 px-3 whitespace-nowrap">Gen</th>
                <th 
                  onClick={() => handleSort('capacityGB')}
                  className="py-3 px-3 cursor-pointer hover:text-white whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    Capacity
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('speedMTs')}
                  className="py-3 px-3 cursor-pointer hover:text-white whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    Speed / Standard
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">Part Number / Model</th>
                <th className="py-3 px-3 whitespace-nowrap">Vendor / Channel</th>
                <th className="py-3 px-3 whitespace-nowrap">Lot Qty</th>
                <th 
                  onClick={() => handleSort('pricePerUnit')}
                  className="py-3 px-3 cursor-pointer hover:text-white whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    Unit Price ($) / Position
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('pricePerGB')}
                  className="py-3 px-3 cursor-pointer hover:text-white whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    $/GB Rate
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">Condition & Testing</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Listing Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredListings.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    No memory listings match your selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredListings.map((item) => {
                  const pricePerGB = item.pricePerUnit / item.capacityGB;
                  const skuKey = `${item.generation}-${item.capacityGB}-${item.speedMTs}`;
                  const bounds = skuPriceBounds.get(skuKey);
                  const isLowest = bounds && item.pricePerUnit === bounds.min;
                  const isHighest = bounds && item.pricePerUnit === bounds.max;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Generation Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] uppercase font-mono ${
                          item.generation === 'DDR3' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          item.generation === 'DDR4' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {item.generation === 'DDR5' 
                            ? (item.moduleType === '3DS RDIMM' ? 'DDR5 (3DS)' : 'DDR5 (Mono)') 
                            : item.generation}
                        </span>
                      </td>

                      {/* Capacity */}
                      <td className="py-3 px-3 font-bold text-white font-mono whitespace-nowrap">
                        {item.capacityGB} GB
                        {(item.capacityGB === 24 || item.capacityGB === 48 || item.capacityGB === 96) && (
                          <span className="ml-1 text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1 py-0.2 rounded font-sans">
                            Non-Bin
                          </span>
                        )}
                        {item.moduleType === '3DS RDIMM' && (
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
                          {item.speedStandard} • {item.rank}
                        </div>
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
                              className="text-slate-400 hover:text-white p-0.5"
                              title="Copy OEM Part Number"
                            >
                              {copiedId === item.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">OEM Equivalent</span>
                        )}
                        <div className="text-[11px] text-slate-400 truncate max-w-[220px]" title={item.title}>
                          {item.title}
                        </div>
                      </td>

                      {/* Vendor */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-200">
                          {item.vendor}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {item.vendorType}
                        </div>
                      </td>

                      {/* Lot Qty */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {item.lotQuantity > 1 ? (
                          <div>
                            <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold px-1.5 py-0.5 rounded text-[10px]">
                              Lot of {item.lotQuantity}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              ${item.totalLotPrice?.toFixed(2)} tot
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500">Single (1x)</span>
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
                              Floor Low
                            </span>
                          )}
                          {isHighest && (
                            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider font-mono">
                              Ceiling High
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
                          {item.warranty || '30-Day Warranty'}
                        </div>
                      </td>

                      {/* Listing Action / Direct Link */}
                      <td className="py-3 px-3 whitespace-nowrap text-right">
                        {item.sourceUrl ? (
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-slate-800/90 hover:bg-indigo-600 text-slate-300 hover:text-white px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border border-slate-700 hover:border-indigo-400 shadow-xs group"
                            title={item.sourceDomain === 'ebay.com' ? 'Open live eBay listing in a new tab' : 'Open distributor source page'}
                          >
                            <span>{item.sourceDomain === 'ebay.com' ? 'View on eBay' : 'View Source'}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-white transition-colors" />
                          </a>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
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
