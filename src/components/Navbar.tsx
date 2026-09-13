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
  Building2,
  Globe,
  Languages
} from 'lucide-react';
import { ResearchMetadata } from '../data/researchMetadata';
import { SupportedTimezone, TIMEZONE_OPTIONS, formatToTimezone } from '../utils/timeFormat';
import { useLanguage } from '../context/LanguageContext';

interface NavbarProps {
  activeTab: 'matrix' | 'listings' | 'curated' | 'trends';
  setActiveTab: (tab: 'matrix' | 'listings' | 'curated' | 'trends') => void;
  totalListingsCount: number;
  totalLiveEbayCount?: number;
  totalCuratedCount?: number;
  onOpenSpecsGuide: () => void;
  onOpenScheduler: () => void;
  metadata: ResearchMetadata;
  selectedTimezone: SupportedTimezone;
  onTimezoneChange: (tz: SupportedTimezone) => void;
  lastUpdatedTimestamp?: string;
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
  selectedTimezone,
  onTimezoneChange,
  lastUpdatedTimestamp,
}) => {
  const { language, toggleLanguage, t } = useLanguage();

  // Compute formatted audit time according to user selected timezone and live dataset timestamp
  const effectiveTimestamp = lastUpdatedTimestamp || metadata.isoTimestamp || "2026-09-04T02:57:22.498Z";
  const auditFormatted = formatToTimezone(effectiveTimestamp, selectedTimezone, { includeDayOfWeek: true });

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md text-slate-200 border-b border-slate-800 shadow-md">
      {/* Top Banner / Research Timestamp Ticker */}
      <div className="bg-slate-950 px-4 py-1.5 text-xs text-slate-400 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px] font-bold text-indigo-300 tracking-wider">
              {t('nav.research_audit', 'RESEARCH AUDIT')}
            </span>
          </div>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {t('nav.updated', 'Updated')}: <strong className="text-white font-semibold">{auditFormatted.dayOfWeek}, {auditFormatted.dateString}</strong> {t('nav.at', 'at')} <strong className="text-amber-300 font-semibold">{auditFormatted.timeString}</strong>
            </span>
          </div>

          {/* Timezone Switcher Dropdown */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-md px-2 py-0.5 text-[11px] font-sans">
            <Globe className="w-3 h-3 text-indigo-400 shrink-0" />
            <span className="text-slate-400 text-[10px] hidden md:inline">{t('nav.timezone', 'Timezone')}:</span>
            <select
              value={selectedTimezone}
              onChange={(e) => onTimezoneChange(e.target.value as SupportedTimezone)}
              className="bg-transparent text-indigo-300 font-semibold text-[11px] focus:outline-none cursor-pointer pr-1"
              title="Change display timezone across all views and tables"
            >
              {TIMEZONE_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key} className="bg-slate-900 text-slate-200">
                  {opt.badge} ({opt.offsetLabel} - {opt.label})
                </option>
              ))}
            </select>
          </div>

          {/* Top Bar Language Switcher Button */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 hover:text-white px-2.5 py-0.5 rounded-md text-[11px] font-sans font-semibold transition-all cursor-pointer shadow-xs"
            title={language === 'en' ? '切换为简体中文 (Translate to Simplified Chinese)' : 'Switch to English'}
          >
            <Languages className="w-3.5 h-3.5 text-indigo-400" />
            <span>{language === 'en' ? '中 / 简体中文' : 'English (EN)'}</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono">
          <button
            onClick={onOpenScheduler}
            className="hidden sm:flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 px-2.5 py-0.5 rounded-full transition-colors font-sans text-[11px] font-medium"
            title="View Daily 8:00 AM HKT (00:00 UTC) Cron Schedule & Audit Logs"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{t('nav.daily_cron_badge', 'Daily 8:00 AM (UTC+8 HKT) Auto-Refresh')}</span>
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
            {totalListingsCount} {t('nav.skus_audited', 'SKUs Audited')}
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
                  {t('nav.title', 'ECC RDIMM')} <span className="text-indigo-400">{t('nav.subtitle_highlight', 'Market Intelligence Index')}</span>
                </h1>
                <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded">
                  {metadata.researchQuarter}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                {t('nav.subtitle_desc', 'Used Server Memory Valuation • Floor & Ceiling Arbitrage • Automated 8:00 AM Backend Engine')}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/80 text-xs px-3 py-1.5 rounded-lg transition-colors border border-indigo-500/30 font-semibold shadow-xs"
              title={language === 'en' ? 'Translate all contents to Simplified Chinese' : '切换为英文界面 (Switch to English)'}
            >
              <Languages className="w-3.5 h-3.5 text-indigo-400" />
              <span>{language === 'en' ? '简体中文' : 'English'}</span>
            </button>

            <button
              onClick={onOpenScheduler}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 text-xs px-3 py-1.5 rounded-lg transition-colors border border-slate-800"
              title="View 8:00 AM Cron Engine Status"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">{t('nav.daily_engine', 'Daily Engine')}</span>
            </button>

            <button
              onClick={onOpenSpecsGuide}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 text-xs px-3 py-1.5 rounded-lg transition-colors border border-slate-800"
              title="Server RAM Specifications Reference Guide"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>{t('nav.specs_guide', 'Specs Guide')}</span>
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
            {t('nav.tab_matrix', 'Market Matrix Overview')}
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
            {t('nav.tab_listings', 'Exact eBay Active Listings & Market Spread')}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono flex items-center gap-1 ${
              activeTab === 'listings' ? 'bg-indigo-700/80 text-white' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live ({totalLiveEbayCount || totalListingsCount})
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
            {t('nav.tab_trends', 'eBay 3-Month Market Trends')}
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
            {t('nav.tab_curated', 'Curated Benchmark Catalog of ITAD Enterprise')}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
              activeTab === 'curated' ? 'bg-indigo-700/80 text-white' : 'bg-slate-800 text-slate-300'
            }`}>
              {totalCuratedCount || 72}
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
};
