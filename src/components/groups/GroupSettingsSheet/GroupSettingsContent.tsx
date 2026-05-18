import React from 'react';
import { EyeOff, Eye, Plus, Maximize, Sparkles, X, Save } from 'lucide-react';
import { DimensionEditor } from '../../admin/edit/DimensionEditor';
import { ProductGroup, Dimension } from '../../../types';

export const GroupSettingsContent: React.FC<{
  groupData: ProductGroup | null;
  setGroupData: React.Dispatch<React.SetStateAction<ProductGroup | null>>;
  handleUpdateGroupData: (updates: Partial<ProductGroup>) => Promise<void>;
  handleBatchUpdateDimensions: (newDims: Dimension[]) => Promise<void>;
  setPromptDialog: (d: { title: string; message: string; placeholder?: string; onSubmit: (val: string) => void } | null) => void;
}> = ({
  groupData, setGroupData, handleUpdateGroupData, handleBatchUpdateDimensions, setPromptDialog
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar h-[calc(100vh-80px)] pb-20">
      {/* Series Identity */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-1 justify-between">
          <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-indigo-600 rounded-full"></div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">系列基本信息 / Series Identity</h4>
          </div>
          
          <button 
            onClick={() => handleUpdateGroupData({ is_hidden: !groupData?.is_hidden })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all cursor-pointer whitespace-nowrap ${groupData?.is_hidden ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-green-50 border-green-200 text-green-600'}`}
          >
              {groupData?.is_hidden ? <EyeOff size={12} /> : <Eye size={12} />}
              <span className="text-[9px] font-bold uppercase tracking-widest leading-none">{groupData?.is_hidden ? '屏蔽中' : '显示中'}</span>
          </button>
        </div>
        
        <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">系列正式名称 (Group Display Name)</label>
            <input 
              value={groupData?.name || ''}
              onChange={(e) => setGroupData(prev => prev ? { ...prev, name: e.target.value } : null)}
              onBlur={(e) => {
                  if (groupData) handleUpdateGroupData({ name: e.target.value });
              }}
              className="w-full bg-white border-2 border-slate-100 rounded-xl p-3 text-sm font-black text-slate-800 outline-none focus:border-indigo-500 transition-all shadow-sm"
              placeholder="例如: 意式极简沙发系列..."
            />
          </div>

          <div className="space-y-4">
            {['zh', 'en', 'ms'].map(lang => (
              <div className="space-y-2" key={lang}>
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{lang === 'zh' ? '系列共同故事 (中文)' : lang === 'en' ? 'Series Story (English)' : 'Cerita Siri (Malay)'}</label>
                <textarea 
                  value={(groupData?.description_translations as any)?.[lang] || (lang === 'zh' ? groupData?.description || '' : '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGroupData(prev => prev ? { 
                      ...prev, 
                      ...(lang === 'zh' ? { description: val } : {}),
                      description_translations: { ...prev.description_translations, [lang]: val } 
                    } : null);
                  }}
                  onBlur={(e) => {
                    const val = e.target.value;
                    if (groupData) handleUpdateGroupData({ 
                      ...(lang === 'zh' ? { description: val } : {}),
                      description_translations: { ...groupData.description_translations, [lang]: val } 
                    });
                  }}
                  className="w-full bg-white border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-600 outline-none focus:border-indigo-500 transition-all shadow-sm h-24 resize-none"
                  placeholder={lang === 'zh' ? '描述這個系列的設計理念...' : lang === 'en' ? 'Describe design concept...' : 'Terangkan konsep...'}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dimensions Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Maximize size={16} className="text-indigo-500" />
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">批量尺寸 / Dimensions (Batch)</h4>
        </div>
        
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <DimensionEditor 
            dimensions={groupData?.dimensions || []}
            onChange={(newDims) => handleUpdateGroupData({ dimensions: newDims as any })}
            t={{ dimensionsTitle: '产品尺寸' } as any}
          />
          
          {(groupData?.dimensions || []).length > 0 && (
            <button
              onClick={() => handleBatchUpdateDimensions(groupData!.dimensions!)}
              className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Save size={14} />
              <span>应用到全组 / Apply to Group</span>
            </button>
          )}
        </div>
      </section>

      {/* DNA Elements */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={16} className="text-indigo-500" />
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">系列DNA / DNA Elements</h4>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-3">系列配色库 (Colors)</label>
              <div className="flex flex-wrap gap-2">
                {(groupData?.colors || []).map((color: string, idx: number) => (
                  <div key={idx} className="group relative">
                    <div className="w-8 h-8 rounded-lg border-2 border-white shadow-sm" style={{ backgroundColor: color }} />
                    <button 
                      onClick={() => handleUpdateGroupData({ colors: (groupData?.colors || []).filter((_, i) => i !== idx) })}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={8} />
                    </button>
                  </div>
                ))}
                <button 
                  onClick={() => setPromptDialog({
                    title: 'Add Color',
                    message: 'Enter Color Hex Code (#FF0000):',
                    onSubmit: (c) => { if (c && c.trim()) handleUpdateGroupData({ colors: [...(groupData?.colors || []), c.trim()] }); }
                  })}
                  className="w-8 h-8 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 hover:text-indigo-400"
                >
                  <Plus size={16} />
                </button>
              </div>
          </div>
        </div>
      </section>
    </div>
  );
};
