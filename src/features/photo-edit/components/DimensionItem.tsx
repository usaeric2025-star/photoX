import React from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { Dimension, TranslationType } from '#src/types/index.js';

interface DimensionItemProps {
  dim: Dimension;
  idx: number;
  total: number;
  onRemove: (idx: number) => void;
  onUpdateLabel: (idx: number, prefix: string, content: string) => void;
  onUpdateUnit: (idx: number, unit: string) => void;
  isAnalyzing?: boolean;
  t: (key: string, ...args: unknown[]) => string;
}

export function DimensionItem({
  dim,
  idx,
  total,
  onRemove,
  onUpdateLabel,
  onUpdateUnit,
  isAnalyzing,
  t
}: DimensionItemProps) {
  const label = dim.label || '';
  const prefixMatch = label.match(/^([A-Z0-9\u4e00-\u9fa5]+)\s*[:：]\s*(.*)$/i);
  const prefix = prefixMatch ? prefixMatch[1] : '';
  
  let dimensionsPart = prefixMatch ? prefixMatch[2] : label;
  if (!dimensionsPart && (dim.height || dim.width || dim.length)) {
    const h = dim.height ? `H${dim.height}` : '';
    const w = dim.width ? `W${dim.width}` : '';
    const l = dim.length ? `L${dim.length}` : '';
    dimensionsPart = [h, w, l].filter(Boolean).join(' x ');
  }

  return (
    <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-100 space-y-3 relative group">
      {total > 1 && (
        <button 
          onClick={() => onRemove(idx)}
          className="absolute -top-2 -right-2 sm:top-2 sm:right-2 p-1.5 bg-white sm:bg-transparent text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all shadow-sm sm:shadow-none border border-slate-100 sm:border-0"
          title={t('deleteSpec')}
        >
          <Icon name="x" size={16} />
        </button>
      )}
      <div className="grid grid-cols-5 gap-2">
        <div className="col-span-2 space-y-1">
          <div className="flex items-center justify-between pl-1">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{t('part')}</span>
            {dim.isAi && (
              <div className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-1 rounded-lg border border-purple-100 shadow-sm">
                <Icon name="sparkles" size={10} className="animate-pulse" />
                <span className="text-[9px] font-black tracking-tighter">AI 识别</span>
              </div>
            )}
          </div>
          <input 
            type="text" 
            placeholder="如: WD" 
            value={prefix} 
            onChange={e => onUpdateLabel(idx, e.target.value.toUpperCase().trim(), dimensionsPart)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
          />
        </div>
        <div className="col-span-3 space-y-1">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter pl-1">{t('unit')}</span>
          <div className="flex gap-1">
            {['cm', 'mm', 'inch'].map(u => (
              <button 
                key={u}
                type="button"
                onClick={() => onUpdateUnit(idx, u)}
                className={`flex-1 py-2 rounded-xl text-[9px] sm:text-[10px] font-bold transition-all border ${dim.unit === u ? 'bg-slate-800 text-white border-slate-800 shadow-md translate-z-1' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between items-center pl-1">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{t('dimensionContent')} (H x W x D)</span>
        </div>
        <input 
          type="text" 
          placeholder={isAnalyzing ? "AI 识别中..." : "H94 x W96 x D23"} 
          value={dimensionsPart || ""} 
          onChange={e => onUpdateLabel(idx, prefix, e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
        />
      </div>
    </div>
  );
}
