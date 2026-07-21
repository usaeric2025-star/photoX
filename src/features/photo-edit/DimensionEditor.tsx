import React from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { Dimension } from '#src/types/index.js';
import { feedback } from '#lib/feedback.js';
import { DimensionItem } from './components/DimensionItem.js';

interface DimensionEditorProps {
  dimensions: Dimension[];
  onChange: (newDims: Dimension[]) => void;
  showAiButton?: boolean;
  isAnalyzing?: boolean;
  onAiAnalyze?: () => void;
  t: (key: string, ...args: unknown[]) => string;
}

/**
 * DimensionEditor
 * 
 * 照片尺寸編輯器，支持手動輸入與 AI 識別。
 */
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
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 leading-none">{t('dimensionsTitle') || '尺寸 / DIMENSIONS'}</span>
          <button 
            type="button"
            onClick={() => feedback.info('AI 识别可自动提取照片中的尺寸规格信息')}
            className="text-slate-300 hover:text-slate-500 transition-colors"
          >
            <Icon name="info" size={12} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {showAiButton && (
            <button 
              type="button"
              onClick={onAiAnalyze}
              disabled={isAnalyzing}
              className={`w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl border transition-all shadow-sm ${isAnalyzing ? 'bg-slate-50 text-slate-400 border-slate-100' : 'bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100'}`}
              title={t('aiRecognize') || 'AI 識別'}
            >
              {isAnalyzing ? (
                <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              ) : (
                <Icon name="sparkles" size={20} />
              )}
            </button>
          )}
          <button 
            type="button"
            onClick={onAddDimension}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-all active:scale-95 shadow-sm"
            title={t('addSpec') || '新增規格'}
          >
            <Icon name="plus" size={20} />
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
}
