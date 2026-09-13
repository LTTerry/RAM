import React from 'react';
import { X, Server, Cpu, Layers, HelpCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface SpecsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SpecsGuideModal: React.FC<SpecsGuideModalProps> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
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
            <h3 className="text-sm font-bold text-white tracking-tight">
              {language === 'zh-CN' ? '企业级 ECC RDIMM 内存规格与兼容性指南' : 'Enterprise ECC RDIMM Specification & Compatibility Guide'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
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
              {language === 'zh-CN' ? '1. RDIMM vs. LRDIMM vs. 3DS RDIMM 架构区别' : '1. RDIMM vs. LRDIMM vs. 3DS RDIMM Differences'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="font-bold text-white text-xs">RDIMM (Registered)</div>
                <p className="mt-1 text-slate-400 text-[11px]">
                  {language === 'zh-CN'
                    ? '主流企业级服务器内存。在内存控制器与 DRAM 芯片之间加入寄存器缓存地址/命令信号。延迟低、功耗较低，不可与 LRDIMM 混插。'
                    : 'Standard enterprise memory. Features a register buffer between the memory controller and DRAM chips for address/command lines. Low latency, lower power draw. Cannot be mixed with LRDIMM.'}
                </p>
              </div>
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="font-bold text-white text-xs">LRDIMM (Load-Reduced)</div>
                <p className="mt-1 text-slate-400 text-[11px]">
                  {language === 'zh-CN'
                    ? '使用隔离内存缓冲芯片 (iMB) 同时对命令与数据线进行缓冲。主要用于 32GB/64GB DDR3 与早期 DDR4，用于突破插槽 Rank 数量限制。'
                    : 'Buffers both command and data lines with an isolation memory buffer (iMB). Primarily used in 32GB/64GB DDR3 and early DDR4 to bypass slot rank limits.'}
                </p>
              </div>
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="font-bold text-white text-xs">3DS RDIMM (3D Stacked)</div>
                <p className="mt-1 text-slate-400 text-[11px]">
                  {language === 'zh-CN'
                    ? '采用硅通孔 (TSV) 垂直堆叠 DRAM 晶圆 die。专用于 128GB 与 256GB 超大容量高密度 DDR4/DDR5 模组。'
                    : 'Uses Through-Silicon Vias (TSV) to stack DRAM dies vertically. Used for high density 128GB and 256GB DDR4/DDR5 modules.'}
                </p>
              </div>
            </div>
          </div>

          {/* Ranks and Organization */}
          <div>
            <h4 className="text-xs font-bold text-white mb-2.5 flex items-center gap-1.5 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              {language === 'zh-CN' ? '2. Rank 拓扑结构: 1Rx4, 2Rx4, 2Rx8, 4Rx4' : '2. Rank Topologies: 1Rx4, 2Rx4, 2Rx8, 4Rx4'}
            </h4>
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-slate-300">
              <p>
                <strong className="text-white">{language === 'zh-CN' ? 'x4 与 x8 DRAM 颗粒区别: ' : 'x4 vs. x8 DRAM Chips: '}</strong>
                {language === 'zh-CN'
                  ? 'x4 模组具备更出色的电气特性，支持高级 Chipkill / 单芯片数据校正 (SDDC) 容错技术，是企业级机架服务器的行业标配。'
                  : 'x4 modules have better electrical characteristics, support advanced Chipkill / Single Device Data Correction (SDDC), and are standard for enterprise servers.'}
              </p>
              <p>
                <strong className="text-white">{language === 'zh-CN' ? '双 Rank (2Rx4) vs 单 Rank (1Rx4): ' : 'Dual Rank (2Rx4) vs Single Rank (1Rx4): '}</strong>
                {language === 'zh-CN'
                  ? '双 Rank 模组可利用 Rank 交错并发机制，在现代服务器内存控制器上带来 3-5% 的有效内存吞吐带宽提升。'
                  : 'Dual Rank modules provide rank interleaving benefits, often giving 3-5% higher effective memory bandwidth on modern memory controllers.'}
              </p>
            </div>
          </div>

          {/* Server Platform Compatibility */}
          <div>
            <h4 className="text-xs font-bold text-white mb-2.5 flex items-center gap-1.5 uppercase tracking-wider">
              <Server className="w-3.5 h-3.5 text-indigo-400" />
              {language === 'zh-CN' ? '3. 主流服务器平台兼容性对照表' : '3. Server Platform Compatibility Matrix'}
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-950 font-semibold text-slate-400 text-[11px]">
                  <tr>
                    <th className="p-2.5 border-b border-slate-800">{language === 'zh-CN' ? '内存代数' : 'Generation'}</th>
                    <th className="p-2.5 border-b border-slate-800">{language === 'zh-CN' ? '支持速率' : 'Supported Speeds'}</th>
                    <th className="p-2.5 border-b border-slate-800">{language === 'zh-CN' ? '常见服务器机型家族' : 'Common Server Families'}</th>
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
              <strong className="text-amber-200">{language === 'zh-CN' ? '重要采购与处置规则: ' : 'Important Procurement Rule: '}</strong>
              {language === 'zh-CN'
                ? '切勿在同一主板上混用 RDIMM 与 LRDIMM。所有通道必须对称插满以获得最大访存带宽与通道吞吐。'
                : 'Never mix RDIMMs and LRDIMMs on the same motherboard. All memory channels should be populated symmetrically for maximum bandwidth.'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold text-xs transition-colors border border-slate-700 cursor-pointer"
          >
            {language === 'zh-CN' ? '关闭指南' : 'Close Guide'}
          </button>
        </div>
      </div>
    </div>
  );
};
