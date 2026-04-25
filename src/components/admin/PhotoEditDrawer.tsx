import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, RefreshCcw, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Photo } from '../../types';

interface Props {
  editPhotoId: string | null;
  resetAddState: () => void;
  saveNewPhoto: () => Promise<void>;
  addName: string;
  setAddName: (n: string) => void;
  addCatId: string | null;
  setAddCatId: (id: string | null) => void;
  addSubId: string | null;
  setAddSubId: (id: string | null) => void;
  addTagIds: string[];
  setAddTagIds: (ids: string[]) => void;
  addNote: string;
  setAddNote: (n: string) => void;
  addManualCode: string;
  setAddManualCode: (c: string) => void;
  addDimL: string;
  setAddDimL: (l: string) => void;
  addDimW: string;
  setAddDimW: (w: string) => void;
  addDimH: string;
  setAddDimH: (h: string) => void;
  addIsHidden: boolean;
  setAddIsHidden: (h: boolean) => void;
  showOtherFields: boolean;
  setShowOtherFields: (s: boolean) => void;
  isSyncing: boolean;
  dbCategories: any[];
  categories: any[];
  appLang: string;
  quickAddSubCategory: () => void;
  quickAddTag: () => void;
  quickAddManufacturer: () => void;
  tags: any[];
  manufacturers: any[];
  editPhotoPreview?: string | null;
  onDelete?: (id: string) => void;
  newPhotoData?: string | null;
  aiDebugInfo: { step: string; message: string; error?: string } | null;
  isAnalyzing?: boolean;
  abortAnalysis?: () => void;
}

export const PhotoEditDrawer: React.FC<Props> = (props) => {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col pt-safe">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm">
        <button onClick={props.resetAddState} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors rounded-full active:bg-slate-100">
          <X size={24} />
        </button>
        {props.aiDebugInfo && (
          <div className="bg-yellow-50 border border-yellow-200 text-black p-4 rounded-xl text-xs font-mono relative">
            <p><strong>[{props.aiDebugInfo.step}]</strong> {props.aiDebugInfo.message}</p>
            {props.aiDebugInfo.error && <p className="text-red-700">错误: {props.aiDebugInfo.error}</p>}
            {props.isAnalyzing && props.abortAnalysis && (
              <button 
                onClick={props.abortAnalysis}
                className="mt-2 text-[8px] bg-red-100 text-red-600 px-3 py-1 rounded-full font-bold uppercase tracking-widest hover:bg-red-200 transition-colors"
              >
                取消识别 (Cancel)
              </button>
            )}
          </div>
        )}
        <div className="flex flex-col items-center">
            <h2 className="font-bold text-lg text-slate-800 ml-1 tracking-tight leading-tight">{props.editPhotoId ? '编辑信息' : '新增信息'}</h2>
            <div 
              onClick={() => props.setAddIsHidden(!props.addIsHidden)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all cursor-pointer mt-1 ${props.addIsHidden ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-green-50 border-green-200 text-green-600'}`}
            >
              {props.addIsHidden ? <EyeOff size={10} /> : <Eye size={10} />}
              <span className="text-[8px] font-bold uppercase tracking-widest">{props.addIsHidden ? '公开屏蔽中' : '公开显示中'}</span>
            </div>
        </div>
        <button 
          onClick={props.saveNewPhoto}
          className={`bg-blue-600 text-white px-6 py-2.5 rounded-2xl text-xs font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-[0.95] flex items-center gap-2 ${props.isSyncing ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {props.isSyncing ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14}/>}
          保存
        </button>
      </div>

       <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-32">
        {(props.newPhotoData || props.editPhotoPreview) && (
          <div className="relative group">
            <div className="aspect-[4/3] rounded-[40px] overflow-hidden bg-slate-900 shadow-2xl flex items-center justify-center border-4 border-white mb-6">
              <img src={props.newPhotoData || props.editPhotoPreview || ''} className="max-w-full max-h-full object-contain" alt="Preview" />
            </div>
          </div>
        )}

        <section className="space-y-3">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">产品编号 (Item Code)</h3>
          <input type="text" placeholder="输入产品编号 (如: SK-2024)..." value={props.addManualCode} onChange={e => props.setAddManualCode(e.target.value)} className="w-full p-4 rounded-2xl border border-slate-200" />
        </section>

        <section className="space-y-3">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">产品名称 (Product Name)</h3>
          <input type="text" placeholder="输入产品名称..." value={props.addName} onChange={e => props.setAddName(e.target.value)} className="w-full p-4 rounded-2xl border border-slate-200" />
        </section>
        
        <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">产品目录 (Category) *</h3>
            <div className="grid grid-cols-2 gap-3">
            {props.dbCategories.map(cat => (
                <button 
                key={cat.code}
                onClick={() => { props.setAddCatId(cat.code); }}
                className={`p-4 rounded-3xl border-2 text-left transition-all active:scale-[0.98] ${props.addCatId === cat.code ? 'bg-white border-blue-600 text-blue-600 shadow-xl shadow-blue-600/5' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}
                >
                <span className="font-bold block text-sm tracking-tight">{cat[props.appLang] || cat.zh}</span>
                <span className="text-[9px] uppercase tracking-wider opacity-60 font-mono">{cat.en}</span>
                </button>
            ))}
            </div>
        </div>
        
        <section className="space-y-4">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">厂商名称 (Manufacturer)</h3>
          </div>
          <div className="flex flex-wrap gap-2 p-1">
            {props.manufacturers.map((mfr: any) => (
              <button 
                key={mfr.id}
                onClick={() => props.setAddSubId(mfr.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${props.addSubId === mfr.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-200'}`}
              >
                {mfr.name}
              </button>
            ))}
            <button onClick={props.quickAddManufacturer} className="px-4 py-2 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100">+ 新增</button>
          </div>
        </section>

          <section className="space-y-4">
             <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">产品标签 (Tags)</h3>
             <div className="flex flex-wrap gap-2 p-1">
                {props.tags.map(tag => (
                  <button 
                    key={tag.id}
                    onClick={() => props.setAddTagIds(props.addTagIds.includes(tag.id) ? props.addTagIds.filter(id => id !== tag.id) : [...props.addTagIds, tag.id])}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${props.addTagIds.includes(tag.id) ? 'bg-slate-800 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}
                  >
                    #{tag.name}
                  </button>
                ))}
                <button onClick={props.quickAddTag} className="px-4 py-2 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100">+ 新增</button>
             </div>
          </section>

          <section className="space-y-3">
             <button 
               onClick={() => props.setShowOtherFields(!props.showOtherFields)}
               className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 active:scale-[0.98] transition-all"
             >
               <span>其他详细信息 (尺寸、备注、手动ID)</span>
               <div className={`transition-transform ${props.showOtherFields ? 'rotate-90' : ''}`}>
                  <ChevronRight size={16} />
               </div>
             </button>
             
             {props.showOtherFields && (
               <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" placeholder="长 cm" value={props.addDimL} onChange={e => props.setAddDimL(e.target.value)} className="p-3 rounded-xl border border-slate-200 bg-white text-center font-bold" />
                    <input type="number" placeholder="宽 cm" value={props.addDimW} onChange={e => props.setAddDimW(e.target.value)} className="p-3 rounded-xl border border-slate-200 bg-white text-center font-bold" />
                    <input type="number" placeholder="高 cm" value={props.addDimH} onChange={e => props.setAddDimH(e.target.value)} className="p-3 rounded-xl border border-slate-200 bg-white text-center font-bold" />
                  </div>
                  <textarea placeholder="备注信息..." value={props.addNote} onChange={e => props.setAddNote(e.target.value)} className="w-full p-4 rounded-2xl border border-slate-200 h-24" />
               </div>
             )}
          </section>

          {props.editPhotoId && props.onDelete && (
            <div className="pt-4 pb-8">
              <button 
                onClick={() => props.onDelete!(props.editPhotoId)}
                className="w-full py-4 rounded-3xl bg-red-50 text-red-600 text-xs font-bold border border-red-100 active:bg-red-200 transition-all flex items-center justify-center gap-2"
              >
                删除此照片
              </button>
            </div>
          )}
       </div>
    </div>
  );
};
