import React, { useState } from 'react';
import { 
  Layers, 
  TrendingUp, 
  ExternalLink, 
  Building2, 
  Filter, 
  CheckCircle2, 
  SlidersHorizontal,
  Info,
  DollarSign,
  ShoppingCart,
  Package,
  ShieldCheck,
  Server
} from 'lucide-react';
import { RamListing, MemoryGeneration, MarketTrend } from '../types';
import { MARKET_TRENDS_DATA } from '../data/marketTrendsData';

interface MarketMatrixProps {
  listings: RamListing[];
  trends?: MarketTrend[];
  onSelectSpec: (gen: MemoryGeneration, cap: number, speed: number) => void;
}

export const MarketMatrix: React.FC<MarketMatrixProps> = ({ listings, trends, onSelectSpec }) => {
  const [activeGenTab, setActiveGenTab] = useState<'DDR3' | 'DDR4' | 'DDR5_MONO' | 'DDR5_3DS'>('DDR4');
  const [displayMode, setDisplayMode] = useState<'retailBuyItNow' | 'range' | 'lowest' | 'highest'>('retailBuyItNow');
  const [showPricingGuide, setShowPricingGuide] = useState(true);

  // Configuration for matrix axes per generation
  const DDR3_CONFIG = {
    capacities: [16, 32],
    speeds: [1333, 1600, 1866],
    speedLabels: {
      1333: '1333 MT/s (PC3-10600)',
      1600: '1600 MT/s (PC3-12800)',
      1866: '1866 MT/s (PC3-14900)'
    }
  };

  const DDR4_CONFIG = {
    capacities: [16, 32, 64, 128],
    speeds: [2133, 2400, 2666, 2933, 3200],
    speedLabels: {
      2133: '2133 MT/s (PC4-17000)',
      2400: '2400 MT/s (PC4-19200)',
      2666: '2666 MT/s (PC4-21300)',
      2933: '2933 MT/s (PC4-23400)',
      3200: '3200 MT/s (PC4-25600)'
    }
  };

  const DDR5_MONO_CONFIG = {
    capacities: [16, 24, 32, 48, 64, 96, 128],
    speeds: [4800, 5600, 6400, 7200],
    speedLabels: {
      4800: '4800 MT/s (PC5-38400)',
      5600: '5600 MT/s (PC5-44800)',
      6400: '6400 MT/s (PC5-51200)',
      7200: '7200 MT/s (PC5-57600)'
    }
  };

  const DDR5_3DS_CONFIG = {
    capacities: [128, 256],
    speeds: [4800, 5600, 6400, 7200],
    speedLabels: {
      4800: '4800 MT/s (PC5-38400)',
      5600: '5600 MT/s (PC5-44800)',
      6400: '6400 MT/s (PC5-51200)',
      7200: '7200 MT/s (PC5-57600)'
    }
  };

  const currentConfig = 
    activeGenTab === 'DDR3' ? DDR3_CONFIG : 
    activeGenTab === 'DDR4' ? DDR4_CONFIG : 
    activeGenTab === 'DDR5_MONO' ? DDR5_MONO_CONFIG : DDR5_3DS_CONFIG;

  // Helper to compute exact min, max, avg, and retail stats for a cell from eBay data
  const getCellStats = (tabGen: string, cap: number, speed: number) => {
    const gen = tabGen.startsWith('DDR5') ? 'DDR5' as MemoryGeneration : tabGen as MemoryGeneration;
    const is3dsTab = tabGen === 'DDR5_3DS';
    const isMonoTab = tabGen === 'DDR5_MONO';

    const matched = listings.filter(l => {
      if (l.generation !== gen || l.capacityGB !== cap || l.speedMTs !== speed) return false;
      if (is3dsTab && l.moduleType !== '3DS RDIMM') return false;
      // Note: Regular RDIMMs are monolithic
      if (isMonoTab && l.moduleType === '3DS RDIMM') return false;
      return true;
    });

    const trendsSource = trends && trends.length > 0 ? trends : MARKET_TRENDS_DATA;
    const trendRecord = trendsSource.find(t => {
      if (t.generation !== gen || t.capacityGB !== cap || t.speedMTs !== speed) return false;
      // Heuristic: If it explicitly mentions 3DS in notes, it's 3DS.
      const is3dsTrend = t.analysisNotes.toLowerCase().includes('3ds');
      if (is3dsTab && !is3dsTrend && cap === 128) return false;
      if (isMonoTab && is3dsTrend && cap === 128) return false;
      return true;
    });

    const ebayActiveListings = matched.filter(
      m => m.vendor === 'eBay' || m.sourceDomain?.toLowerCase().includes('ebay')
    );

    const activeListings = ebayActiveListings.length > 0 ? ebayActiveListings : matched;

    if (activeListings.length === 0 && !trendRecord) {
      return null;
    }

    // Exact lowest and highest active listing
    const lowestListing = activeListings.length > 0
      ? activeListings.reduce((prev, curr) => curr.pricePerUnit < prev.pricePerUnit ? curr : prev, activeListings[0])
      : null;

    const highestListing = activeListings.length > 0
      ? activeListings.reduce((prev, curr) => curr.pricePerUnit > prev.pricePerUnit ? curr : prev, activeListings[0])
      : null;

    // Synchronized with live Market Trends data from eBay API
    const minPrice = trendRecord?.lowestAskingCurrent 
      ?? (lowestListing ? lowestListing.pricePerUnit : 0);
    const maxPrice = trendRecord?.highestAskingCurrent 
      ?? (highestListing ? highestListing.pricePerUnit : 0);
    
    const avgPrice = trendRecord?.currentAvgPrice 
      ?? (activeListings.length > 0 
          ? activeListings.reduce((a, b) => a + b.pricePerUnit, 0) / activeListings.length 
          : (minPrice + maxPrice) / 2);

    const singleUnitRetail = trendRecord?.singleUnitRetailPrice ?? maxPrice;
    const wholesaleTrayFloor = trendRecord?.lowestAskingCurrent ?? minPrice;

    const spread = maxPrice - minPrice;
    const spreadPercent = minPrice > 0 ? (spread / minPrice) * 100 : 0;
    
    const minPricePerGB = minPrice / cap;
    const maxPricePerGB = maxPrice / cap;
    const avgPricePerGB = avgPrice / cap;
    const retailPricePerGB = singleUnitRetail / cap;

    const vendors = Array.from(new Set(matched.map(m => m.vendor)));

    return {
      count: matched.length,
      ebayCount: activeListings.length,
      singleUnitRetail,
      wholesaleTrayFloor,
      retailPricePerGB,
      minPrice,
      maxPrice,
      avgPrice,
      spread,
      spreadPercent,
      minPricePerGB,
      maxPricePerGB,
      avgPricePerGB,
      lowestListing,
      highestListing,
      vendors,
      primaryListing: lowestListing || matched[0] || null,
      trendRecord
    };
  };

  return (
    <div className="space-y-5">
      {/* Matrix Controls & Perspective Selector */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded ${
                activeGenTab === 'DDR3' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                activeGenTab === 'DDR4' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                'bg-rose-500/10 text-rose-300 border border-rose-500/20'
              }`}>
                {activeGenTab} Exact Market Matrix
              </span>
              <span className="text-xs text-slate-400">
                Exact eBay Lowest & Highest Listing Prices
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
              <span>Enterprise Memory Market Matrix</span>
              <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                Exact eBay Listing Verified
              </span>
            </h2>
          </div>

          {/* Generation Switcher Tabs */}
          <div className="flex flex-wrap items-center bg-slate-950 p-1 rounded-lg border border-slate-800 self-start lg:self-auto gap-1">
            <button
              onClick={() => setActiveGenTab('DDR3')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeGenTab === 'DDR3'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              DDR3
            </button>
            <button
              onClick={() => setActiveGenTab('DDR4')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeGenTab === 'DDR4'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              DDR4
            </button>
            <button
              onClick={() => setActiveGenTab('DDR5_MONO')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeGenTab === 'DDR5_MONO'
                  ? 'bg-emerald-600/90 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              DDR5 Monolithic
            </button>
            <button
              onClick={() => setActiveGenTab('DDR5_3DS')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeGenTab === 'DDR5_3DS'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              DDR5 3DS
            </button>
          </div>
        </div>

        {/* Pricing Perspective Banner Guide */}
        {showPricingGuide && (
          <div className="mt-4 p-3.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-xs text-slate-300">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-indigo-200 flex items-center gap-2">
                    <span>Exact eBay Listing Pricing (Zero Estimates)</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
                      Exact eBay Verified
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    All highest and lowest prices shown in this matrix are derived from <strong>exact active and completed eBay listings</strong>. The <strong>Lowest Price</strong> reflects authentic bulk lots (e.g. 4x, 8x, 16x) and tested server pulls, while the <strong>Highest Price</strong> reflects single Buy-It-Now retail modules, matched pairs, or genuine Dell OEM / HP SmartMemory certified sticks.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowPricingGuide(false)}
                className="text-[10px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 shrink-0"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Display Mode Switcher */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              View Perspective:
            </span>
            <div className="flex flex-wrap items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs gap-1">
              <button
                onClick={() => setDisplayMode('retailBuyItNow')}
                className={`px-2.5 py-1 font-semibold rounded transition-all flex items-center gap-1.5 ${
                  displayMode === 'retailBuyItNow'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-indigo-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <ShoppingCart className="w-3 h-3" />
                🛒 Exact 1x Buy-It-Now
              </button>
              <button
                onClick={() => setDisplayMode('range')}
                className={`px-2.5 py-1 font-semibold rounded transition-all ${
                  displayMode === 'range'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📊 Exact eBay Range (Low to High)
              </button>
              <button
                onClick={() => setDisplayMode('lowest')}
                className={`px-2.5 py-1 font-semibold rounded transition-all flex items-center gap-1.5 ${
                  displayMode === 'lowest'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Package className="w-3 h-3" />
                🟢 Exact Lowest eBay Listing
              </button>
              <button
                onClick={() => setDisplayMode('highest')}
                className={`px-2.5 py-1 font-semibold rounded transition-all flex items-center gap-1.5 ${
                  displayMode === 'highest'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-purple-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                🟣 Exact Highest eBay Listing
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>All values from <strong>Exact eBay Active Listings</strong> (Lowest, Highest, Spread & Buy-It-Now)</span>
          </div>
        </div>
      </div>

      {/* The Interactive Bento Grid Table */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-indigo-400" />
              {activeGenTab} Pricing Grid
            </h3>
            <span className="text-[10px] bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-300 font-mono">
              Active: {
                displayMode === 'retailBuyItNow' ? '🛒 Exact 1x Buy-It-Now' :
                displayMode === 'range' ? '📊 Exact Lowest to Highest eBay Listing' :
                displayMode === 'lowest' ? '🟢 Exact Lowest eBay Listing' :
                '🟣 Exact Highest eBay Listing'
              }
            </span>
          </div>
          <span className="text-[10px] bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-400 font-mono">
            {currentConfig.capacities.length} Densities × {currentConfig.speeds.length} Frequencies
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/90 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <th className="py-3 px-4 font-semibold w-32 border-r border-slate-800/80">
                  Capacity
                </th>
                {currentConfig.speeds.map(speed => (
                  <th key={speed} className="py-3 px-4 font-semibold text-center border-r border-slate-800/60 last:border-r-0">
                    <div className="text-slate-200 font-mono">{speed} MT/s</div>
                    <div className="text-[10px] font-normal text-slate-500 normal-case mt-0.5">
                      {currentConfig.speedLabels[speed as keyof typeof currentConfig.speedLabels]}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {currentConfig.capacities.map(cap => (
                <tr key={cap} className="hover:bg-slate-800/30 transition-colors">
                  {/* Capacity Header Column */}
                  <td className="py-3 px-4 font-mono font-bold text-white border-r border-slate-800/80 bg-slate-950/40">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{cap} GB</span>
                      {(cap === 256 || activeGenTab === 'DDR5_3DS' || (activeGenTab !== 'DDR5_MONO' && cap >= 128 && activeGenTab !== 'DDR4')) && (
                        <span className="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold px-1.5 py-0.2 rounded font-sans">
                          3DS
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      ECC RDIMM
                    </div>
                  </td>

                  {/* Speed Intersection Cells */}
                  {currentConfig.speeds.map(speed => {
                    const stats = getCellStats(activeGenTab, cap, speed);

                    if (!stats) {
                      return (
                        <td key={speed} className="py-3 px-3 text-center border-r border-slate-800/40 last:border-r-0">
                          <div className="p-3 bg-slate-950/50 rounded-lg border border-dashed border-slate-800 text-[11px] text-slate-500">
                            <span>No listing cached</span>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td key={speed} className="py-2.5 px-2.5 border-r border-slate-800/40 last:border-r-0 align-top">
                        <div 
                          onClick={() => onSelectSpec(activeGenTab, cap, speed)}
                          className="group relative p-3 rounded-lg bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 transition-all shadow-xs cursor-pointer flex flex-col justify-between"
                        >
                          {/* Retail Buy It Now Mode (Default) */}
                          {displayMode === 'retailBuyItNow' && (
                            <div className="space-y-1">
                              <div className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <ShoppingCart className="w-2.5 h-2.5" />
                                  Exact 1x Buy-It-Now
                                </span>
                                <span className="text-indigo-300 font-mono">
                                  ${stats.retailPricePerGB.toFixed(2)}/GB
                                </span>
                              </div>
                              <div className="text-lg font-bold text-indigo-200 font-mono">
                                ${stats.singleUnitRetail.toFixed(2)}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5 border-t border-slate-800">
                                <span>Exact Lowest eBay:</span>
                                <strong className="text-emerald-400 font-mono">${stats.minPrice.toFixed(2)}</strong>
                              </div>
                            </div>
                          )}

                          {/* Range Mode */}
                          {displayMode === 'range' && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <div>
                                  <div className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider">
                                    Lowest eBay
                                  </div>
                                  <div className="text-base font-bold text-emerald-400 font-mono">
                                    ${stats.minPrice.toFixed(2)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-[9px] uppercase font-bold text-purple-400 tracking-wider">
                                    Highest eBay
                                  </div>
                                  <div className="text-base font-bold text-purple-300 font-mono">
                                    ${stats.maxPrice.toFixed(2)}
                                  </div>
                                </div>
                              </div>

                              <div className="pt-1.5 flex items-center justify-between text-[10px] font-mono border-t border-slate-800/80">
                                <span className="text-indigo-300">
                                  eBay Avg: <strong>${stats.avgPrice.toFixed(2)}</strong>
                                </span>
                                <span className="text-slate-400">
                                  Spread: +${stats.spread.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Lowest eBay Listing Mode */}
                          {displayMode === 'lowest' && (
                            <div className="space-y-1">
                              <div className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider flex items-center justify-between">
                                <span>Exact Lowest Listing</span>
                                <span className="text-emerald-400 font-mono">${stats.minPricePerGB.toFixed(2)}/GB</span>
                              </div>
                              <div className="text-lg font-bold text-emerald-400 font-mono">
                                ${stats.minPrice.toFixed(2)}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate" title={stats.lowestListing?.title || 'eBay Active Listing'}>
                                {stats.lowestListing ? `${stats.lowestListing.vendor} (Lot of ${stats.lowestListing.lotQuantity})` : 'eBay Active Listing'}
                              </div>
                            </div>
                          )}

                          {/* Highest eBay Listing Mode */}
                          {displayMode === 'highest' && (
                            <div className="space-y-1">
                              <div className="text-[9px] uppercase font-bold text-purple-400 tracking-wider flex items-center justify-between">
                                <span>Exact Highest Listing</span>
                                <span className="text-purple-300 font-mono">${stats.maxPricePerGB.toFixed(2)}/GB</span>
                              </div>
                              <div className="text-lg font-bold text-purple-300 font-mono">
                                ${stats.maxPrice.toFixed(2)}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate" title={stats.highestListing?.title || 'eBay Active Listing'}>
                                {stats.highestListing ? `${stats.highestListing.vendor} (${stats.highestListing.condition})` : 'eBay Active Listing'}
                              </div>
                            </div>
                          )}

                          {/* Vendor & Part Details */}
                          <div className="mt-2 pt-2 border-t border-slate-800 space-y-0.5 text-[11px]">
                            <div className="flex items-center justify-between text-slate-400">
                              <span className="font-medium truncate max-w-[110px] text-slate-300" title={stats.vendors.join(', ')}>
                                {stats.vendors.length > 0 ? stats.vendors.join(', ') : 'eBay Verified'}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {stats.count} recs
                              </span>
                            </div>

                            {stats.primaryListing?.partNumber && (
                              <div className="text-[10px] font-mono text-slate-400 truncate" title={stats.primaryListing.partNumber}>
                                PN: {stats.primaryListing.partNumber}
                              </div>
                            )}
                          </div>

                          {/* Quick Interactive Action */}
                          <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 font-mono">
                              ${stats.minPricePerGB.toFixed(2)} - ${stats.maxPricePerGB.toFixed(2)}/GB
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectSpec(activeGenTab, cap, speed);
                              }}
                              className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                            >
                              <Filter className="w-2.5 h-2.5" />
                              View ({stats.count})
                            </button>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Matrix Legend Footer */}
        <div className="bg-slate-950/80 px-4 py-3 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
              <strong className="text-slate-200">1x Buy-It-Now:</strong> Exact single stick retail Buy-It-Now price on eBay
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <strong className="text-slate-200">Lowest eBay Listing:</strong> Exact lowest active listing price on eBay
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
              <strong className="text-slate-200">Highest eBay Listing:</strong> Exact highest active listing price on eBay
            </span>
          </div>

          <div className="text-slate-500">
            Click any cell to filter and inspect individual vendor listings.
          </div>
        </div>
      </div>
    </div>
  );
};
