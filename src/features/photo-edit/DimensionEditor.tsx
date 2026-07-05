import { Icon } from '#src/components/ui/Icon.js';
import { Button } from '#src/components/ui/Button.js';
import { Dimension, TranslationType } from '#src/types/index.js';
import { safeArray } from '#lib/utils.js';
import { showToast } from '#lib/ui/toast.js';

interface DimensionEditorProps {
  dimensions: Dimension[];
  onChange: (newDims: Dimension[]) => void;
  showAiButton?: boolean;
  isAnalyzing?: boolean;
  onAiAnalyze?: () => void;
  t: (key: string, ...args: any[]) => string;
}

import { DimensionItem } from './components/DimensionItem.js';

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
    newDims[idx] = { ...newDims[idx], label: finalLabel, isAi: false };
    
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
    newDims[idx].unit = u as 'cm' | 'inch' | 'mm';
    newDims[idx].isAi = false;
    onChange(newDims);
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between pl-1">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 leading-none">{t('dimensionsTitle')}</span>
          <button 
            type="button"
            onClick={() => showToast.info('AI 识别可自动提取照片中的尺寸规格信息')}
            className="text-slate-300 hover:text-slate-500 transition-colors"
          >
            <Icon name="info" size={12} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {showAiButton && (
            <Button 
              onClick={onAiAnalyze}
              loading={isAnalyzing}
              className={`min-h-[44px] min-w-[44px] text-[9px] font-black px-3 py-1 rounded-xl border transition-all ${isAnalyzing ? 'bg-slate-50 text-slate-400 border-slate-100' : 'bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100'}`}
              leftIcon={!isAnalyzing && <Icon name="sparkles" size={16} />}
              title={t('aiRecognize')}
            >
              <span className="hidden sm:inline">{isAnalyzing ? '识别中...' : 'AI 识别'}</span>
              <span className="sm:hidden">{isAnalyzing ? '...' : 'AI'}</span>
            </Button>
          )}
          <button 
            onClick={onAddDimension}
            type="button"
            className="min-h-[44px] px-3 sm:px-4 text-[9px] sm:text-xs font-black text-blue-600 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <span className="text-base sm:text-lg">+</span>
            <span className="hidden sm:inline">{t('addSpec')}</span>
            <span className="sm:hidden">+</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {displayDims.map((dim, idx) => (
          <DimensionItem 
            key={`dim-${idx}`}
            dim={dim}
            idx={idx}
            total={displayDims.length}
            onRemove={onRemoveDimension}
            onUpdateLabel={handleUpdateLabel}
            onUpdateUnit={handleUnitChange}
            isAnalyzing={isAnalyzing}
            t={t}
          />
        ))}
      </div>
    </div>
  );
};
