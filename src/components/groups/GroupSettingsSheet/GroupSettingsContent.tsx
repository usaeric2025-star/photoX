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
            {/* ZH */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">系列故事 (中文 / ZH)</label>
              <textarea 
                value={groupData?.description_translations?.zh || groupData?.description || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setGroupData(prev => prev ? { 
                    ...prev, 
                    description: val,
                    description_translations: { ...prev.description_translations, zh: val } 
                  } : null);
                }}
                onBlur={(e) => {
                  const val = e.target.value;
                  if (groupData) handleUpdateGroupData({ 
                    description: val,
                    description_translations: { ...groupData.description_translations, zh: val } 
                  });
                }}
                className="w-full bg-white border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-600 outline-none focus:border-indigo-500 transition-all shadow-sm h-20 resize-none"
                placeholder="描述这个系列的中文设计理念..."
              />
            </div>

            {/* EN */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Series Story (English / EN)</label>
              <textarea 
                value={groupData?.description_translations?.en || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setGroupData(prev => prev ? { 
                    ...prev, 
                    description_translations: { ...prev.description_translations, en: val } 
                  } : null);
                }}
                onBlur={(e) => {
                  const val = e.target.value;
                  if (groupData) handleUpdateGroupData({ 
                    description_translations: { ...groupData.description_translations, en: val } 
                  });
                }}
                className="w-full bg-white border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-600 outline-none focus:border-indigo-500 transition-all shadow-sm h-20 resize-none"
                placeholder="Describe this series design concept in English..."
              />
            </div>

            {/* MS */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Kisah Siri (Malay / MS)</label>
              <textarea 
                value={groupData?.description_translations?.ms || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setGroupData(prev => prev ? { 
                    ...prev, 
                    description_translations: { ...prev.description_translations, ms: val } 
                  } : null);
                }}
                onBlur={(e) => {
                  const val = e.target.value;
                  if (groupData) handleUpdateGroupData({ 
                    description_translations: { ...groupData.description_translations, ms: val } 
                  });
                }}
                className="w-full bg-white border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-600 outline-none focus:border-indigo-500 transition-all shadow-sm h-20 resize-none"
                placeholder="Terangkan konsep siri ini dalam Bahasa Melayu..."
              />
            </div>
          </div>
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

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-3">系列材质库 (Materials)</label>
              <div className="flex flex-wrap gap-2">
                {(groupData?.materials || []).map((material: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-1 px-3 py-1 bg-white border border-slate-150 rounded-lg text-xs font-black text-slate-700 shadow-sm group">
                    <span>{material}</span>
                    <button 
                      onClick={() => handleUpdateGroupData({ materials: (groupData?.materials || []).filter((_, i) => i !== idx) })}
                      className="text-slate-400 hover:text-red-500 transition-colors ml-1 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <button 
                  onClick={() => setPromptDialog({
                    title: '添加材质 / Add Material',
                    message: '请输入新材质名称:',
                    placeholder: '如: 黄铜, 皮革, 实木, Leather...',
                    onSubmit: (m) => { if (m && m.trim()) handleUpdateGroupData({ materials: [...(groupData?.materials || []), m.trim()] }); }
                  })}
                  className="px-3 py-1 rounded-lg border border-dashed border-slate-200 bg-white flex items-center justify-center gap-1 text-slate-400 hover:text-indigo-600 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Plus size={12} />
                  <span>添加材质</span>
                </button>
              </div>
          </div>
        </div>
      </section>
    </div>
  );
};
