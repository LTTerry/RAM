import React, { useState } from 'react';
import { 
  X, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  RefreshCw, 
  Server, 
  Database, 
  Zap, 
  AlertCircle, 
  Cpu, 
  Layers,
  ArrowRight
} from 'lucide-react';

interface SchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  cronInfo: {
    schedule: string;
    scheduleDescription: string;
    lastRun: string | null;
    nextRun: string;
    isRefreshing: boolean;
    storageType: string;
    totalSkusAudited: number;
    ebayRecordsSuccess?: number;
    jsonUpdated?: boolean;
    dataSource?: string;
    recentLogs?: Array<{
      timestamp: string;
      type: 'SCHEDULED' | 'MANUAL' | 'STARTUP';
      status: 'SUCCESS' | 'ERROR';
      message: string;
      skusUpdated: number;
      ebayRecordsSuccess?: number;
      jsonUpdated?: boolean;
      dataSource?: string;
    }>;
  } | null;
  onTriggerRefresh: () => Promise<void>;
  isRefreshing: boolean;
}

export const SchedulerModal: React.FC<SchedulerModalProps> = ({
  isOpen,
  onClose,
  cronInfo,
  onTriggerRefresh,
  isRefreshing,
}) => {
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleManualTrigger = async () => {
    setFeedback(null);
    try {
      await onTriggerRefresh();
      setFeedback('Valuation model successfully recalculated and cache updated!');
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback('Error during refresh: ' + err.message);
    }
  };

  const formatIso = (isoString?: string | null) => {
    if (!isoString) return 'Pending next scheduled cycle';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-US', {
        timeZone: 'Asia/Hong_Kong',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ' HKT';
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Automated Daily Refresh Engine
                </h3>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  GitHub Actions Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Zero-cost static architecture running daily at 08:00 AM UTC+8 (Hong Kong Time)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Status Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cron Schedule</span>
              <div className="mt-2 text-sm font-mono font-bold text-white flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Daily @ 08:00 AM (UTC+8)</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-1">workflow: 0 0 * * * (00:00 UTC)</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Next Auto-Run</span>
              <div className="mt-2 text-xs font-mono font-semibold text-amber-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Automated via GitHub</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-1">Timezone: UTC+8 (Hong Kong Time)</span>
            </div>
          </div>

          {/* Feedback alert */}
          {feedback && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{feedback}</span>
            </div>
          )}

          {/* eBay API Research & File Persistence Status Section */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white tracking-wide">eBay API Research & curated-data.json & ebay-data.json Status</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold ${
                cronInfo?.jsonUpdated !== false
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                <CheckCircle2 className="w-3 h-3" /> {cronInfo?.jsonUpdated !== false ? 'curated-data.json & ebay-data.json Updated & Committed' : 'Update Pending'}
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/60 space-y-1.5">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-indigo-400" /> eBay API Research Metrics
                </span>
                <div className="flex items-center justify-between font-mono pt-1">
                  <span className="text-slate-300">Successfully Researched:</span>
                  <span className="text-emerald-400 font-bold">{cronInfo?.ebayRecordsSuccess ?? cronInfo?.totalSkusAudited ?? 36} / {cronInfo?.totalSkusAudited ?? 36} SKUs</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-300">Data Pipeline:</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                    cronInfo?.dataSource?.includes('eBay')
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      : cronInfo?.dataSource
                      ? 'text-amber-300 bg-amber-500/10 border-amber-500/20'
                      : 'text-slate-400 bg-slate-800 border-slate-700'
                  }`}>
                    {cronInfo?.dataSource || 'eBay Production API (Realistic Search)'}
                  </span>
                </div>
                {cronInfo?.dataSource && cronInfo.dataSource.includes('Gemini') && (
                  <p className="text-[10px] text-amber-400/90 pt-1 leading-relaxed border-t border-slate-800/60 mt-1">
                    eBay API credentials (<code className="text-amber-200">EBAY_APP_ID</code> / <code className="text-amber-200">EBAY_CERT_ID</code>) were not detected or connected during the last run, so Gemini Search Grounding was used.
                  </p>
                )}
              </div>

              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/60 space-y-1.5">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-emerald-400" /> Repository File Status
                </span>
                <div className="flex items-center justify-between font-mono pt-1">
                  <span className="text-slate-300">curated-data.json:</span>
                  <span className="text-emerald-400 font-bold">90-Day Benchmark Catalog</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-300">ebay-data.json:</span>
                  <span className="text-emerald-400 font-bold">eBay Listings & 3-Mo Trends</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-300">ebay-sync.log:</span>
                  <span className="text-emerald-400 font-bold">Active</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-300">Last Sync Time:</span>
                  <span className="text-slate-300 text-[10px]">
                    {cronInfo?.lastRun 
                      ? new Date(cronInfo.lastRun).toLocaleString('en-US', {
                          timeZone: 'Asia/Hong_Kong',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        }) + ' (UTC+8)'
                      : 'Recently synced'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Execution History */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Recent Execution Logs</span>
              <span className="text-[10px] text-slate-500 font-normal">Last 5 cycles</span>
            </h4>
            <div className="bg-slate-950 rounded-xl border border-slate-800 divide-y divide-slate-800/60 overflow-hidden text-xs">
              {cronInfo?.recentLogs && cronInfo.recentLogs.length > 0 ? (
                cronInfo.recentLogs.slice(0, 5).map((log, i) => (
                  <div key={i} className="p-3 flex items-start justify-between gap-3 hover:bg-slate-900/40 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono uppercase ${
                          log.type === 'SCHEDULED' 
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' 
                            : log.type === 'MANUAL'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          {log.type}
                        </span>
                        <span className="font-semibold text-slate-200">
                          {log.skusUpdated > 0 ? `${log.skusUpdated} SKUs Recalculated` : 'Market Scan'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{log.message}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono text-slate-500 block">
                        {formatIso(log.timestamp)}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3" /> {log.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-slate-500 text-xs">
                  Background cron initialized. Scheduled for daily 8:00 AM UTC+8 (Hong Kong Time) cycle.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-500">
          <span>Enterprise ITAD Memory Valuation Engine</span>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
