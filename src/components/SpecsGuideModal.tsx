import React from 'react';
import { X, Server, Cpu, Layers, HelpCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface SpecsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SpecsGuideModal: React.FC<SpecsGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white tracking-tight">Enterprise ECC RDIMM Specification & Compatibility Guide</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300 leading-relaxed">
          {/* Module Types */}
          <div>
            <h4 className="text-xs font-bold text-white mb-2.5 flex items-center gap-1.5 uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              1. RDIMM vs. LRDIMM vs. 3DS RDIMM Differences
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="font-bold text-white text-xs">RDIMM (Registered)</div>
                <p className="mt-1 text-slate-400 text-[11px]">
                  Standard enterprise memory. Features a register buffer between the memory controller and DRAM chips for address/command lines. Low latency, lower power draw. Cannot be mixed with LRDIMM.
                </p>
              </div>
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="font-bold text-white text-xs">LRDIMM (Load-Reduced)</div>
                <p className="mt-1 text-slate-400 text-[11px]">
                  Buffers both command and data lines with an isolation memory buffer (iMB). Primarily used in 32GB/64GB DDR3 and early DDR4 to bypass slot rank limits.
                </p>
              </div>
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="font-bold text-white text-xs">3DS RDIMM (3D Stacked)</div>
                <p className="mt-1 text-slate-400 text-[11px]">
                  Uses Through-Silicon Vias (TSV) to stack DRAM dies vertically. Used for high density 128GB and 256GB DDR4/DDR5 modules.
                </p>
              </div>
            </div>
          </div>

          {/* Ranks and Organization */}
          <div>
            <h4 className="text-xs font-bold text-white mb-2.5 flex items-center gap-1.5 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              2. Rank Topologies: 1Rx4, 2Rx4, 2Rx8, 4Rx4
            </h4>
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-slate-300">
              <p>
                <strong className="text-white">x4 vs. x8 DRAM Chips:</strong> x4 modules have better electrical characteristics, support advanced Chipkill / Single Device Data Correction (SDDC), and are standard for enterprise servers.
              </p>
              <p>
                <strong className="text-white">Dual Rank (2Rx4) vs Single Rank (1Rx4):</strong> Dual Rank modules provide rank interleaving benefits, often giving 3-5% higher effective memory bandwidth on modern memory controllers.
              </p>
            </div>
          </div>

          {/* Server Platform Compatibility */}
          <div>
            <h4 className="text-xs font-bold text-white mb-2.5 flex items-center gap-1.5 uppercase tracking-wider">
              <Server className="w-3.5 h-3.5 text-indigo-400" />
              3. Server Platform Compatibility Matrix
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-950 font-semibold text-slate-400 text-[11px]">
                  <tr>
                    <th className="p-2.5 border-b border-slate-800">Generation</th>
                    <th className="p-2.5 border-b border-slate-800">Supported Speeds</th>
                    <th className="p-2.5 border-b border-slate-800">Common Server Families</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-[11px] bg-slate-950/60">
                  <tr>
                    <td className="p-2.5 font-bold text-amber-400">DDR3</td>
                    <td className="p-2.5 font-mono text-slate-300">1333, 1600, 1866 MT/s</td>
                    <td className="p-2.5 text-slate-400">Dell 11G/12G (R710, R720), HPE Gen8, Cisco UCS M3, Mac Pro 2013</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-sky-400">DDR4</td>
                    <td className="p-2.5 font-mono text-slate-300">2133, 2400, 2666, 2933, 3200 MT/s</td>
                    <td className="p-2.5 text-slate-400">Dell 13G/14G/15G (R730, R740, R750), HPE Gen9/Gen10, EPYC 7001-7003</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-emerald-400">DDR5</td>
                    <td className="p-2.5 font-mono text-slate-300">4800, 5600, 6400, 7200 MT/s</td>
                    <td className="p-2.5 text-slate-400">Dell 16G (R760, XE9680), HPE Gen11, AMD EPYC 9004/9005, Xeon 4th/5th/6th Gen</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Warning */}
          <div className="p-3.5 bg-amber-950/30 rounded-xl border border-amber-800/60 text-amber-300 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-200">Important Procurement Rule:</strong> Never mix RDIMMs and LRDIMMs on the same motherboard. All memory channels should be populated symmetrically for maximum bandwidth.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold text-xs transition-colors border border-slate-700"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
