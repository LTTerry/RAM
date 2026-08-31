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
    recentLogs?: Array<{
      timestamp: string;
      type: 'SCHEDULED' | 'MANUAL' | 'STARTUP';
      status: 'SUCCESS' | 'ERROR';
      message: string;
      skusUpdated: number;
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
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
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
                Zero-cost static architecture running daily at 08:00 AM UTC
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cron Schedule</span>
              <div className="mt-2 text-sm font-mono font-bold text-white flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Daily @ 08:00 AM</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-1">workflow: 0 8 * * *</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Next Auto-Run</span>
              <div className="mt-2 text-xs font-mono font-semibold text-amber-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Automated via GitHub</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-1">Timezone: UTC</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Database Cost</span>
              <div className="mt-2 text-sm font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>$0.00 / mo</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-1">GitHub Pages Hosting</span>
            </div>
          </div>

          {/* Architecture Details Box */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-indigo-400" />
              GitHub Actions Architecture & Valuation Routine
            </h4>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li>
                <strong className="text-slate-200">Scheduled Trigger:</strong> A GitHub Actions workflow runs every morning at 8:00 AM UTC.
              </li>
              <li>
                <strong className="text-slate-200">Price Model:</strong> A Node script evaluates the latest secondary market clearing movements across all SKUs.
              </li>
              <li>
                <strong className="text-slate-200">Static Export:</strong> The script overwrites <code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded">market-data.json</code> and automatically deploys the static site to GitHub Pages.
              </li>
            </ul>
          </div>

          {/* Feedback alert */}
          {feedback && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Manual Run Action */}
          <div className="bg-indigo-950/30 border border-indigo-500/30 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>GitHub Actions Manual Trigger</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                To force an immediate scan, you must trigger the <strong>"Daily Market Data Sync"</strong> workflow in your GitHub repository's Actions tab.
              </p>
            </div>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-lg text-xs font-bold text-white flex items-center gap-2 shadow-sm transition-all bg-indigo-600 hover:bg-indigo-500 active:scale-95 whitespace-nowrap"
            >
              Open GitHub
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
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
                  Background cron initialized. Scheduled for daily 8:00 AM cycle.
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
