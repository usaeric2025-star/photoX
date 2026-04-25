import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, RefreshCcw } from 'lucide-react';
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
  showOtherFields: boolean;
  setShowOtherFields: (s: boolean) => void;
  isSyncing: boolean;
  dbCategories: any[];
  categories: any[];
  appLang: string;
  quickAddSubCategory: () => void;
  quickAddTag: () => void;
  tags: any[];
}

export const PhotoEditDrawer: React.FC<Props> = (props) => {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col pt-safe">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm">
        <button onClick={props.resetAddState} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors rounded-full active:bg-slate-100">
          <X size={24} />
        </button>
        <h2 className="font-bold text-lg text-slate-800 ml-1 tracking-tight">{props.editPhotoId ? '編輯資訊' : '新增資訊'}</h2>
        <button 
          onClick={props.saveNewPhoto}
          className={`bg-blue-600 text-white px-6 py-2.5 rounded-2xl text-xs font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-[0.95] flex items-center gap-2 ${props.isSyncing ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {props.isSyncing ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14}/>}
          保存
        </button>
      </div>

       <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-32">
        {props.newPhotoData && (
          <div className="aspect-[4/3] rounded-[40px] overflow-hidden bg-slate-900 shadow-2xl flex items-center justify-center border-4 border-white mb-6">
            <img src={props.newPhotoData} className="max-w-full max-h-full object-contain" alt="Preview" />
          </div>
        )}
        
        <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">主分類 *</h3>
            <div className="grid grid-cols-2 gap-3">
            {props.dbCategories.map(cat => (
                <button 
                key={cat.code}
                onClick={() => { props.setAddCatId(cat.code); props.setAddSubId(null); }}
                className={`p-4 rounded-3xl border-2 text-left transition-all active:scale-[0.98] ${props.addCatId === cat.code ? 'bg-white border-blue-600 text-blue-600 shadow-xl shadow-blue-600/5' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}
                >
                <span className="font-bold block text-sm tracking-tight">{cat[props.appLang] || cat.zh}</span>
                <span className="text-[9px] uppercase tracking-wider opacity-60 font-mono">{cat.en}</span>
                </button>
            ))}
            </div>
        </div>
        
        {props.addCatId && (
            <section className="space-y-4">
              <div className="flex items-center justify-between pl-1">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">子分類</h3>
                <button onClick={props.quickAddSubCategory} className="text-[10px] text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-full active:scale-95 transition-transform">+ 新增</button>
              </div>
              <div className="flex flex-wrap gap-2 p-1">
                {props.categories.find(c => c.id === props.addCatId)?.subcategories.map((sub: any) => (
                  <button 
                    key={sub.id}
                    onClick={() => props.setAddSubId(sub.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${props.addSubId === sub.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-200'}`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
             <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">標籤</h3>
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
             <input type="text" placeholder="產品名稱" value={props.addName} onChange={e => props.setAddName(e.target.value)} className="w-full p-4 rounded-2xl border border-slate-200" />
             <input type="text" placeholder="手動編號" value={props.addManualCode} onChange={e => props.setAddManualCode(e.target.value)} className="w-full p-4 rounded-2xl border border-slate-200" />
             <textarea placeholder="備註" value={props.addNote} onChange={e => props.setAddNote(e.target.value)} className="w-full p-4 rounded-2xl border border-slate-200 h-24" />
             <div className="grid grid-cols-3 gap-2">
                <input type="number" placeholder="長cm" value={props.addDimL} onChange={e => props.setAddDimL(e.target.value)} className="p-3 rounded-xl border border-slate-200" />
                <input type="number" placeholder="寬cm" value={props.addDimW} onChange={e => props.setAddDimW(e.target.value)} className="p-3 rounded-xl border border-slate-200" />
                <input type="number" placeholder="高cm" value={props.addDimH} onChange={e => props.setAddDimH(e.target.value)} className="p-3 rounded-xl border border-slate-200" />
             </div>
          </section>
       </div>
    </div>
  );
};
