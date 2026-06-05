import { Sparkles, X as CloseIcon } from 'lucide-react';
import { Dimension, TranslationType } from '../../../types';
import { safeArray } from '../../../lib/utils';

interface DimensionEditorProps {
  dimensions: Dimension[];
  onChange: (newDims: Dimension[]) => void;
  showAiButton?: boolean;
  isAnalyzing?: boolean;
  onAiAnalyze?: () => void;
  t: TranslationType;
}

export function DimensionEditor({
  dimensions,
  onChange,
  showAiButton,
  isAnalyzing,
  onAiAnalyze,
  t
}: DimensionEditorProps) {
  const displayDims = dimensions.length > 0 ? dimensions : [{ label: '', length: 0, width: 0, height: 0, unit: 'cm' } as Dimension];

  const handleUpdateLabel = (idx: number, newPrefix: string, newDimPart: string) => {
    const finalLabel = newPrefix ? `${newPrefix}: ${newDimPart}` : newDimPart;
    const newDims = [...displayDims];
    newDims[idx] = { ...newDims[idx], label: finalLabel, is_ai: false };
    
    // Attempt to parse numbers for background data
    const hMatch = newDimPart.match(/H\s*[:：=x*]?\s*(\d+(\.\d+)?)/i);
    const wMatch = newDimPart.match(/W\s*[:：=x*]?\s*(\d+(\.\d+)?)/i);
    const lMatch = newDimPart.match(/L\s*[:：=x*]?\s*(\d+(\.\d+)?)/i);
    const dMatch = newDimPart.match(/D\s*[:：=x*]?\s*(\d+(\.\d+)?)/i);
    
    if (hMatch) newDims[idx].height = parseFloat(hMatch[1]);
    if (wMatch) newDims[idx].width = parseFloat(wMatch[1]);
    if (lMatch) newDims[idx].length = parseFloat(lMatch[1]);
    else if (dMatch) newDims[idx].length = parseFloat(dMatch[1]);

    onChange(newDims);
  };

  const onAddDimension = () => {
    onChange([...dimensions, { label: '', length: 0, width: 0, height: 0, unit: 'cm' }]);
  };

  const onRemoveDimension = (idx: number) => {
    onChange(dimensions.filter((_, i) => i !== idx));
  };

  const handleUnitChange = (idx: number, u: string) => {
    const newDims = [...displayDims];
    newDims[idx].unit = u as any;
    newDims[idx].is_ai = false;
    onChange(newDims);
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between pl-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 leading-none">{t.dimensionsTitle}</span>
        <div className="flex items-center gap-2">
          {showAiButton && (
            <button 
              onClick={onAiAnalyze}
              disabled={isAnalyzing}
              className={`min-h-[44px] min-w-[44px] text-[9px] font-black px-3 py-1 rounded-xl border flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${isAnalyzing ? 'bg-slate-50 text-slate-400 border-slate-100' : 'bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100'}`}
              title={t.aiRecognize}
            >
              <Sparkles size={16} className={isAnalyzing ? 'animate-spin' : ''} /> 
              <span className="hidden sm:inline">{isAnalyzing ? '识别中...' : 'AI 识别'}</span>
              <span className="sm:hidden">{isAnalyzing ? '...' : 'AI'}</span>
            </button>
          )}
          <button 
            onClick={onAddDimension}
            className="min-h-[44px] px-3 sm:px-4 text-[9px] sm:text-xs font-black text-blue-600 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <span className="text-base sm:text-lg">+</span>
            <span className="hidden sm:inline">{t.addSpec}</span>
            <span className="sm:hidden">+</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {displayDims.map((dim, idx) => {
          const label = dim.label || '';
          const prefixMatch = label.match(/^([A-Z0-9\u4e00-\u9fa5]+)\s*[:：]\s*(.*)$/i);
          const prefix = prefixMatch ? prefixMatch[1] : '';
          const dimensionsPart = prefixMatch ? prefixMatch[2] : label;

          return (
            <div key={`dim-${idx}`} className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-100 space-y-3 relative group">
              {dimensions.length > 1 && (
                <button 
                  onClick={() => onRemoveDimension(idx)}
                  className="absolute -top-2 -right-2 sm:top-2 sm:right-2 p-1.5 bg-white sm:bg-transparent text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all shadow-sm sm:shadow-none border border-slate-100 sm:border-0 z-10"
                  title={t.deleteSpec}
                >
                  <CloseIcon size={16} />
                </button>
              )}
              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-2 space-y-1">
                  <div className="flex items-center justify-between pl-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{t.part}</span>
                    {dim.is_ai && (
                      <div className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-1 rounded-lg border border-purple-100 shadow-sm">
                        <Sparkles size={10} className="animate-pulse" />
                        <span className="text-[9px] font-black tracking-tighter">AI 识别</span>
                      </div>
                    )}
                  </div>
                  <input 
                    type="text" 
                    placeholder="如: WD" 
                    value={prefix} 
                    onChange={e => handleUpdateLabel(idx, e.target.value.toUpperCase().trim(), dimensionsPart)}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white text-base sm:text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
                  />
                </div>
                <div className="col-span-3 space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter pl-1">{t.unit}</span>
                  <div className="flex gap-1">
                    {['cm', 'mm', 'inch'].map(u => (
                      <button 
                        key={u}
                        onClick={() => handleUnitChange(idx, u)}
                        className={`flex-1 py-2 rounded-xl text-[9px] sm:text-[10px] font-bold transition-all border ${dim.unit === u ? 'bg-slate-800 text-white border-slate-800 shadow-md translate-z-1' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                      >
                        {u === 'inch' ? 'in' : u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center pl-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{t.dimensionContent} (H x W x D)</span>
                </div>
                <input 
                  type="text" 
                  placeholder={isAnalyzing ? "AI 识别中..." : "H94 x W96 x D23"} 
                  value={dimensionsPart || (isAnalyzing ? "" : "")} 
                  onChange={e => handleUpdateLabel(idx, prefix, e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-base sm:text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
