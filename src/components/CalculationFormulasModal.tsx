import React from 'react';
import { X, Calculator, DollarSign, TrendingDown, Layers, HelpCircle, ArrowRight } from 'lucide-react';

interface CalculationFormulasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CalculationFormulasModal: React.FC<CalculationFormulasModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Calculation Formulas & Pricing Methodology
              </h2>
              <p className="text-xs text-slate-400">
                Mathematical definitions used for Exact eBay Active Listings, Spreads & Historical Metrics
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
        <div className="p-6 overflow-y-auto space-y-6 text-slate-300 text-sm">
          
          {/* Formula 1: Exact eBay Avg */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 font-mono text-xs flex items-center justify-center font-bold">
                  1
                </span>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  Exact eBay Avg ($)
                  <span className="text-[11px] font-mono text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded">
                    currentAvgPrice
                  </span>
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">Live Normalized Mean</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-xs text-indigo-300 overflow-x-auto">
              Exact eBay Avg = ( ∑ Normalized Unit Prices of Active Listings ) / N
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <p>
                <strong className="text-white">Lot Normalization Logic:</strong> If an eBay listing is sold as a kit or lot (e.g. <em>&quot;Lot of 4x 32GB 2Rx4 PC4-2400T&quot;</em> for $155.20), the engine parses the title lot count (4) and divides total price by 4 to obtain the true per-module unit price ($38.80/unit).
              </p>
              <p className="text-slate-400">
                Outliers and unrelated peripheral listings are discarded so only genuine tested RDIMM/LRDIMM server modules are averaged.
              </p>
            </div>
          </div>

          {/* Formula 2: Market Spread */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-mono text-xs flex items-center justify-center font-bold">
                  2
                </span>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  Market Spread ($ and %)
                  <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                    priceDispersion
                  </span>
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">Min vs Max Asking</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs text-amber-300">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                Spread ($) = Highest Asking - Lowest Asking
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                Spread (%) = [ (Highest - Lowest) / Lowest ] × 100%
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <p>
                <strong className="text-white">Meaning for ITAD & Procurement:</strong> A wide spread (e.g. &gt;100%) indicates significant marketplace price friction or arbitrage opportunities between bulk wholesale tray pulls and single-unit retail vendors with OEM pre-testing.
              </p>
              <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800/80 text-[11px] text-slate-300 font-mono">
                Example: DDR4 32GB 2666MT/s — Lowest $38.75, Highest $135.82 → Spread = $97.07 (+250.5%)
              </div>
            </div>
          </div>

          {/* Formula 3: 90-Day Change */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 font-mono text-xs flex items-center justify-center font-bold">
                  3
                </span>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  90-Day Change (%)
                  <span className="text-[11px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                    quarterChangePct
                  </span>
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">Quarterly Trajectory</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-xs text-rose-300 overflow-x-auto">
              90-Day Change (%) = [ (Current Avg Price - Avg Price 3 Mo Ago) / (Avg Price 3 Mo Ago) ] × 100%
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <p>
                <strong className="text-white">Trend Classification:</strong>
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-400 pl-1 text-[11px]">
                <li><strong className="text-rose-400">Downward (&lt; -3%):</strong> Decommissioning influx and excess cloud supply.</li>
                <li><strong className="text-emerald-400">Upward (&gt; +3%):</strong> Enterprise upgrade demand or memory fab production reallocation.</li>
                <li><strong className="text-slate-300">Stable (-3% to +3%):</strong> Balanced secondary market liquidity.</li>
              </ul>
            </div>
          </div>

          {/* Formula 4: Retail $/GB */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-xs flex items-center justify-center font-bold">
                  4
                </span>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  Retail $/GB
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    unitPricePerGB
                  </span>
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">Density Cost Curve</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-xs text-emerald-300 overflow-x-auto">
              Retail $/GB = ( Single Unit Retail Price ) / ( Module Capacity in GB )
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <p>
                <strong className="text-white">Why $/GB Matters:</strong> Allows direct cost-per-gigabyte comparison across capacities (16GB vs 32GB vs 64GB vs 128GB vs 256GB).
              </p>
              <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800/80 text-[11px] text-slate-300">
                Typically, sweet-spot capacities (e.g., DDR4 32GB/64GB) offer the lowest $/GB ($1.10 - $1.40/GB), whereas highest-density 3DS modules (128GB/256GB) command steep density premiums ($5.00+ /GB).
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Synced with eBay Production Browse API & ITAD Market Benchmarks
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
