import React from 'react';
import { Maximize2, Sparkles } from 'lucide-react';
import { Dimension } from '@/types/photo';

interface DimensionsSectionProps {
  dimensions?: Dimension[];
  texts: {
    dimensions: string;
    standard: string;
    aiEstimated: string;
  };
}

export function DimensionsSection({ dimensions, texts }: DimensionsSectionProps) {
  if (!Array.isArray(dimensions) || dimensions.length === 0) return null;

  return (
    <section>
      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
        <Maximize2 size={12} /> {texts.dimensions}
      </h4>
      <div className="space-y-2">
        {dimensions.map((dim, idx) => (
          <div key={idx} className="flex flex-col text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                {(dim.label || '').replace(/[:：]\s*$/, '') || texts.standard}
                {dim.is_ai && <Sparkles size={10} className="text-blue-500" aria-label={texts.aiEstimated} />}
              </span>
              <span className="text-[9px] uppercase font-bold text-slate-400">
                {dim.unit === 'in' ? 'inch' : dim.unit}
              </span>
            </div>
            <span className="font-mono text-slate-600">
              {dim.height ? `H${dim.height}` : ''}
              {dim.width ? (dim.height ? ' x ' : '') + `W${dim.width}` : ''}
              {dim.length ? ((dim.height || dim.width) ? ' x ' : '') + `D${dim.length}` : ''}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
