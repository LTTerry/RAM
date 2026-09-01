import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { MarketMatrix } from './components/MarketMatrix';
import { ListingsTable } from './components/ListingsTable';
import { MarketTrends } from './components/MarketTrends';
import { SpecsGuideModal } from './components/SpecsGuideModal';
import { SchedulerModal } from './components/SchedulerModal';

import { INITIAL_RAM_LISTINGS } from './data/initialMemoryData';
import { CURRENT_RESEARCH_METADATA, ResearchMetadata } from './data/researchMetadata';
import { RamListing, MemoryGeneration } from './types';
import { Server, ArrowRight, Clock, Calendar, CheckCircle2, RefreshCw, Activity, Zap } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'matrix' | 'listings' | 'trends'>('matrix');
  const [listings, setListings] = useState<RamListing[]>(INITIAL_RAM_LISTINGS);
  const [metadata, setMetadata] = useState<ResearchMetadata>(CURRENT_RESEARCH_METADATA);
  const [cronInfo, setCronInfo] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedGeneration, setSelectedGeneration] = useState<MemoryGeneration | 'ALL'>('ALL');
  const [isSpecsGuideOpen, setIsSpecsGuideOpen] = useState(false);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);

  // Fetch static market data from GitHub Pages host on load
  const fetchMarketData = async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}market-data.json`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (Array.isArray(data.listings) && data.listings.length > 0) {
            setListings(data.listings);
          }
          if (data.metadata) {
            setMetadata(data.metadata);
          }
          if (data.cronInfo) {
            setCronInfo(data.cronInfo);
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch market-data.json, using fallback local state:', err);
    }
  };

  useEffect(() => {
    fetchMarketData();
  }, []);

  // Trigger manual on-demand market scan & recalculation
  const handleTriggerRefresh = async () => {
    setIsRefreshing(true);
    try {
      // In a static GitHub Pages environment, we can't trigger a backend script directly from the client.
      // We simulate a fetch from the latest static file instead, or you can trigger a GitHub Dispatch event if a PAT is provided.
      await new Promise(resolve => setTimeout(resolve, 800));
      await fetchMarketData();
    } catch (err) {
      console.error('Error refreshing market data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Matrix cell click: filter table
  const handleSelectMatrixSpec = (gen: MemoryGeneration, cap: number, speed: number) => {
    setSelectedGeneration(gen);
    setActiveTab('listings');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans antialiased selection:bg-indigo-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalListingsCount={listings.length}
        onOpenSpecsGuide={() => setIsSpecsGuideOpen(true)}
        onOpenScheduler={() => setIsSchedulerOpen(true)}
        metadata={metadata}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'matrix' && (
          <div className="space-y-5">
            {/* Bento Quick Highlights Header */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Left Bento Highlight */}
              <div className="md:col-span-8 bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight">
                        ECC RDIMM <span className="text-indigo-400">Market Intelligence Index</span>
                      </h2>
                      <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mt-0.5">
                        ITAD Enterprise Hardware Secondary Pricing & Valuation Benchmarks
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:flex bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs font-bold text-indigo-300 tracking-wider font-mono">
                      {metadata.researchQuarter} REPORT
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-300 font-mono text-[11px] bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Research Updated: <strong className="text-white">{metadata.lastUpdatedDay}, {metadata.lastUpdatedDate}</strong> at <strong className="text-amber-300">{metadata.lastUpdatedTime}</strong> <span className="text-slate-500">({metadata.timezone})</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('listings')}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      Browse Catalog ({listings.length})
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsSchedulerOpen(true)}
                      className="bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      Daily 8:00 AM (UTC+8) Cron Engine
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Bento Mini Stat */}
              <div className="md:col-span-4 bg-indigo-600 border border-indigo-500/60 rounded-xl p-5 flex flex-col justify-between text-white shadow-sm">
                <div>
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest opacity-80 mb-2">
                    <span>Automated Backend Engine</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] flex items-center gap-1 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span> 08:00 AM UTC+8 DAILY
                    </span>
                  </div>
                  <div className="text-2xl font-mono font-bold">
                    {listings.length} SKUs Audited
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-indigo-400/40 flex justify-between items-center text-[11px] opacity-90 font-mono">
                  <span>eBay • CPU Medics • ServerSupply</span>
                  <span className="font-bold">{metadata.researchQuarter}</span>
                </div>
              </div>
            </div>

            <MarketMatrix
              listings={listings}
              onSelectSpec={handleSelectMatrixSpec}
            />
          </div>
        )}

        {activeTab === 'listings' && (
          <ListingsTable
            listings={listings}
            selectedGeneration={selectedGeneration}
            onFilterGeneration={setSelectedGeneration}
          />
        )}

        {activeTab === 'trends' && (
          <MarketTrends />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900/60 border-t border-slate-800 mt-12 py-5 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-indigo-600 text-white flex items-center justify-center font-mono font-bold text-xs">
              ECC
            </div>
            <span className="text-slate-300">
              <strong className="text-white">ECC RDIMM Market Intelligence</strong> • Comprehensive ITAD Valuation Benchmarks
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-400 text-[11px]">
            <span className="flex items-center gap-1 font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Research Update: <strong className="text-slate-200">{metadata.lastUpdatedDay}, {metadata.lastUpdatedDate} • {metadata.lastUpdatedTime} {metadata.timezone}</strong>
            </span>
            <span>•</span>
            <button
              onClick={() => setIsSchedulerOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 underline font-medium"
            >
              8:00 AM UTC+8 Cron Status
            </button>
            <span>•</span>
            <button
              onClick={() => setIsSpecsGuideOpen(true)}
              className="text-indigo-400 hover:text-indigo-300 underline"
            >
              Compatibility Guide
            </button>
          </div>
        </div>
      </footer>

      {/* Specs Guide Modal */}
      <SpecsGuideModal
        isOpen={isSpecsGuideOpen}
        onClose={() => setIsSpecsGuideOpen(false)}
      />

      {/* Scheduler Modal */}
      <SchedulerModal
        isOpen={isSchedulerOpen}
        onClose={() => setIsSchedulerOpen(false)}
        cronInfo={cronInfo}
        onTriggerRefresh={handleTriggerRefresh}
        isRefreshing={isRefreshing}
      />
    </div>
  );
}
