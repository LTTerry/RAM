import React from 'react';
import { 
  Server, 
  Cpu, 
  TrendingDown, 
  HelpCircle,
  Clock,
  Calendar,
  Layers,
  Activity,
  Building2
} from 'lucide-react';
import { ResearchMetadata } from '../data/researchMetadata';

interface NavbarProps {
  activeTab: 'matrix' | 'listings' | 'curated' | 'trends';
  setActiveTab: (tab: 'matrix' | 'listings' | 'curated' | 'trends') => void;
  totalListingsCount: number;
  totalLiveEbayCount?: number;
  totalCuratedCount?: number;
  onOpenSpecsGuide: () => void;
  onOpenScheduler: () => void;
  metadata: ResearchMetadata;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  totalListingsCount,
  totalLiveEbayCount = 0,
  totalCuratedCount = 0,
  onOpenSpecsGuide,
  onOpenScheduler,
  metadata,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md text-slate-200 border-b border-slate-800 shadow-md">
      {/* Top Banner / Research Timestamp Ticker */}
      <div className="bg-slate-950 px-4 py-1.5 text-xs text-slate-400 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px] font-bold text-indigo-300 tracking-wider">RESEARCH AUDIT</span>
          </div>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Updated: <strong className="text-white font-semibold">{metadata.lastUpdatedDay}, {metadata.lastUpdatedDate}</strong> at <strong className="text-amber-300 font-semibold">{metadata.lastUpdatedTime}</strong> <span className="text-slate-500">({metadata.timezone})</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono">
          <button
            onClick={onOpenScheduler}
            className="hidden sm:flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 px-2.5 py-0.5 rounded-full transition-colors font-sans text-[11px] font-medium"
            title="View Daily 8:00 AM (UTC+8) Cron Schedule & Audit Logs"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Daily 8:00 AM (UTC+8) Auto-Refresh (Active)</span>
          </button>

          <span className="text-slate-400 hidden lg:inline">
            DDR3: <span className="text-amber-400 font-semibold">$0.33-$0.81/GB</span>
          </span>
          <span className="text-slate-400 hidden lg:inline">
            DDR4: <span className="text-sky-400 font-semibold">$0.91-$1.56/GB</span>
          </span>
          <span className="text-slate-400 hidden lg:inline">
            DDR5: <span className="text-rose-300 font-semibold">$1.75-$3.05/GB</span>
          </span>
          <span className="bg-slate-850 border border-slate-700 text-indigo-300 px-2 py-0.5 rounded text-[11px] font-mono font-bold">
            {totalListingsCount} SKUs Audited
          </span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 border border-indigo-400/30 flex items-center justify-center shadow-inner">
              <Server className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight leading-none">
                  ECC RDIMM <span className="text-indigo-400">Market Intelligence Index</span>
                </h1>
                <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded">
                  {metadata.researchQuarter}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                Used Server Memory Valuation • Floor & Ceiling Arbitrage • Automated 8:00 AM Backend Engine
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenScheduler}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 text-xs px-3 py-1.5 rounded-lg transition-colors border border-slate-800"
              title="View 8:00 AM Cron Engine Status"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Daily Engine</span>
            </button>

            <button
              onClick={onOpenSpecsGuide}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 text-xs px-3 py-1.5 rounded-lg transition-colors border border-slate-800"
              title="Server RAM Specifications Reference Guide"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Specs Guide</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 overflow-x-auto py-2 border-t border-slate-800/80 scrollbar-none">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'matrix'
                ? 'bg-indigo-600 text-white border border-indigo-400/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Market Matrix Grid
          </button>

          <button
            onClick={() => setActiveTab('listings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'listings'
                ? 'bg-indigo-600 text-white border border-indigo-400/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            All Asking Prices & Vendors
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono flex items-center gap-1 ${
              activeTab === 'listings' ? 'bg-indigo-700/80 text-white' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live eBay ({totalLiveEbayCount || totalListingsCount})
            </span>
          </button>

          <button
            onClick={() => setActiveTab('curated')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'curated'
                ? 'bg-indigo-600 text-white border border-indigo-400/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Curated Benchmark Catalog
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
              activeTab === 'curated' ? 'bg-indigo-700/80 text-white' : 'bg-slate-800 text-slate-300'
            }`}>
              {totalCuratedCount || 72}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('trends')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'trends'
                ? 'bg-indigo-600 text-white border border-indigo-400/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            3-Month Market Trends
          </button>
        </nav>
      </div>
    </header>
  );
};
