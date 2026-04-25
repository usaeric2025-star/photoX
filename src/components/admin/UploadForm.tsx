import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Trash2, RefreshCcw, Plus, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Category, Tag, DB_Category } from '../../types';

interface UploadFormProps {
  onClose: () => void;
  editPhotoId: string | null;
  newPhotoData: string | null;
  isAnalyzing: boolean;
  handleSingleAiAnalyze: (imageData: string | null, catId?: string) => void;
  deletePhoto: (id: string) => void;
  saveNewPhoto: () => void;
  isSyncing: boolean;
  addName: string;
  setAddName: (name: string) => void;
  addCatId: string | null;
  setAddCatId: (id: string | null) => void;
  addSubId: string | null;
  setAddSubId: (id: string | null) => void;
  addTagIds: string[];
  setAddTagIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  addNote: string;
  setAddNote: (note: string) => void;
  addManualCode: string;
  setAddManualCode: (code: string) => void;
  showOtherFields: boolean;
  setShowOtherFields: (show: boolean) => void;
  addDimL: string;
  setAddDimL: (val: string) => void;
  addDimW: string;
  setAddDimW: (val: string) => void;
  addDimH: string;
  setAddDimH: (val: string) => void;
  addIsHidden: boolean;
  setAddIsHidden: (h: boolean) => void;
  dbCategories: DB_Category[];
  appLang: string;
  categories: Category[];
  tags: Tag[];
  quickAddSubCategory: () => void;
  quickAddTag: () => void;
  quickAddManufacturer: () => void;
  manufacturers: any[];
  aiDebugInfo: { step: string; message: string; error?: string } | null;
  abortAnalysis?: () => void;
}

export const UploadForm: React.FC<UploadFormProps> = ({
  onClose, editPhotoId, newPhotoData, isAnalyzing, handleSingleAiAnalyze,
  deletePhoto, saveNewPhoto, isSyncing, addName, setAddName, addCatId, setAddCatId,
  addSubId, setAddSubId, addTagIds, setAddTagIds, addNote, setAddNote,
  addManualCode, setAddManualCode, showOtherFields, setShowOtherFields,
  addDimL, setAddDimL, addDimW, setAddDimW, addDimH, setAddDimH,
  addIsHidden, setAddIsHidden,
  dbCategories, appLang, categories, tags, quickAddSubCategory, quickAddTag, quickAddManufacturer, manufacturers,
  aiDebugInfo, abortAnalysis
}) => {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col pt-safe">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm">
        <button onClick={onClose} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors rounded-full active:bg-slate-100">
          <X size={24} />
        </button>
        <div className="flex flex-col items-center">
            <h2 className="font-bold text-lg text-slate-800 ml-1 tracking-tight leading-tight">{editPhotoId ? '編輯產品' : '產品入庫'}</h2>
            <div 
              onClick={() => setAddIsHidden(!addIsHidden)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all cursor-pointer mt-1 ${addIsHidden ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-green-50 border-green-200 text-green-600'}`}
            >
              {addIsHidden ? <EyeOff size={10} /> : <Eye size={10} />}
              <span className="text-[8px] font-bold uppercase tracking-widest">{addIsHidden ? '公开屏蔽中' : '公开显示中'}</span>
            </div>
        </div>
        <div className="flex items-center gap-2">
          {!editPhotoId && newPhotoData && (
            <button 
              onClick={() => handleSingleAiAnalyze(newPhotoData, addCatId || undefined)}
              disabled={isAnalyzing}
              className={`w-10 h-10 rounded-2xl border transition-all flex items-center justify-center shadow-sm active:scale-90 ${isAnalyzing ? 'bg-purple-100 border-purple-200' : 'bg-white border-slate-200 hover:bg-purple-50 text-purple-600'}`}
              title="AI 辨識"
            >
              {isAnalyzing ? <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={20} />}
            </button>
          )}
          {editPhotoId && (
            <button 
              onClick={() => deletePhoto(editPhotoId)}
              className="w-10 h-10 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-100 transition-all active:scale-90"
              title="刪除照片"
            >
              <Trash2 size={20} />
            </button>
          )}
          <button 
            onClick={saveNewPhoto}
            disabled={isSyncing}
            className={`bg-slate-800 text-white px-6 py-2.5 rounded-2xl text-xs font-bold shadow-lg shadow-slate-800/10 transition-all active:scale-95 flex items-center gap-2 ${isSyncing ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {isSyncing ? <RefreshCcw size={14} className="animate-spin" /> : null}
            完成儲存
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-32">
        <div className="aspect-[4/3] rounded-[40px] overflow-hidden bg-slate-900 shadow-2xl flex items-center justify-center border-4 border-white">
          {newPhotoData && <img src={newPhotoData} className="max-w-full max-h-full object-contain" alt="New" />}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20 rounded-[36px]">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-center px-4">
                <p className="text-white font-bold text-sm">正在识别中 (AI Analyzing)...</p>
                {aiDebugInfo && <p className="text-blue-300 text-[10px] mt-1 uppercase tracking-widest">{aiDebugInfo.step}: {aiDebugInfo.message}</p>}
              </div>
              {abortAnalysis && (
                <button 
                  onClick={abortAnalysis}
                  className="mt-2 px-6 py-2 bg-red-500 text-white text-[10px] font-bold rounded-full hover:bg-red-600 transition-all uppercase tracking-widest shadow-lg"
                >
                  取消识别 (Skip/Cancel)
                </button>
              )}
            </div>
          )}
        </div>

        <section className="space-y-2">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">编号 / Item Code</h3>
            <input 
              type="text" 
              placeholder="输入产品编号 (如: SK-2024)..."
              className="w-full bg-white border border-slate-200 p-5 rounded-3xl text-sm outline-none focus:border-blue-500 transition-all shadow-sm font-bold placeholder:text-slate-300"
              value={addManualCode}
              onChange={(e) => setAddManualCode(e.target.value)}
            />
        </section>

        <section className="space-y-2">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">名称 / Product Name</h3>
            <input 
              type="text" 
              placeholder="输入产品名称..."
              className="w-full bg-white border border-slate-200 p-5 rounded-3xl text-sm outline-none focus:border-blue-500 transition-all shadow-sm font-bold placeholder:text-slate-300"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
            />
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">目录 / Category *</h3>
          <div className="grid grid-cols-2 gap-3">
            {dbCategories.map(cat => (
              <button 
                key={cat.code}
                onClick={() => { setAddCatId(cat.code); }}
                className={`p-4 rounded-3xl border-2 text-left transition-all active:scale-[0.98] ${addCatId === cat.code ? 'bg-white border-slate-800 text-slate-800 shadow-xl' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}
              >
                <span className="font-bold block text-sm tracking-tight">{cat[appLang as keyof DB_Category] || cat.zh}</span>
                <span className="text-[9px] uppercase tracking-wider opacity-60 font-mono">{cat.en}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">厂商 / Manufacturer</h3>
          </div>
          <div className="flex flex-wrap gap-2 p-1">
            {manufacturers?.map(mfr => (
              <button 
                key={mfr.id}
                onClick={() => setAddSubId(mfr.id)}
                className={`px-5 py-2.5 rounded-full border text-xs font-bold transition-all active:scale-[0.97] ${addSubId === mfr.id ? 'bg-slate-800 border-slate-800 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}
              >
                {mfr.name}
              </button>
            ))}
            <button onClick={quickAddManufacturer} className="px-4 py-2 rounded-full border border-dashed border-slate-300 text-slate-400 text-xs flex items-center gap-2 font-bold hover:border-slate-400 hover:text-slate-600 active:scale-95 transition-all">
              <Plus size={14} /> 新增
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">标签 / Tags</h3>
          <div className="flex flex-wrap gap-2 p-1">
            {tags.map(tag => (
              <button 
                key={tag.id}
                onClick={() => setAddTagIds(prev => prev.includes(tag.id) ? prev.filter(tid => tid !== tag.id) : [...prev, tag.id])}
                className={`px-4 py-2 rounded-full border text-xs font-bold transition-all active:scale-[0.97] ${addTagIds.includes(tag.id) ? 'bg-purple-500 border-purple-500 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}
              >
                #{tag.name}
              </button>
            ))}
            <button onClick={quickAddTag} className="px-4 py-2 rounded-full border border-dashed border-slate-300 text-slate-400 text-xs flex items-center gap-2 font-bold hover:border-slate-400 hover:text-slate-600 active:scale-95 transition-all">
              <Plus size={14} /> 新增
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <button 
            onClick={() => setShowOtherFields(!showOtherFields)}
            className="w-full flex items-center justify-between p-5 bg-white border border-slate-200 rounded-3xl text-sm font-bold text-slate-800 shadow-sm active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`p-1 rounded-full bg-slate-100 text-slate-500 transition-transform duration-300 ${showOtherFields ? 'rotate-90' : ''}`}>
                <ChevronRight size={16} />
              </div>
              <span>其他 / Others (尺寸、说明、备注)</span>
            </div>
            <div className="w-2 h-2 rounded-full bg-slate-200"></div>
          </button>

          <AnimatePresence>
            {showOtherFields && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-4 pt-2"
              >
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 font-mono tracking-tight">产品尺寸 (长 x 宽 x 高) cm</label>
                  <div className="grid grid-cols-3 gap-3">
                    <input 
                      type="number"
                      placeholder="長"
                      value={addDimL}
                      onChange={(e) => setAddDimL(e.target.value)}
                      className="w-full bg-slate-100/50 border border-slate-200 p-3.5 rounded-2xl text-center text-sm font-bold shadow-inner outline-none focus:bg-white focus:border-blue-500"
                    />
                    <input 
                      type="number"
                      placeholder="寬"
                      value={addDimW}
                      onChange={(e) => setAddDimW(e.target.value)}
                      className="w-full bg-slate-100/50 border border-slate-200 p-3.5 rounded-2xl text-center text-sm font-bold shadow-inner outline-none focus:bg-white focus:border-blue-500"
                    />
                    <input 
                      type="number"
                      placeholder="高"
                      value={addDimH}
                      onChange={(e) => setAddDimH(e.target.value)}
                      className="w-full bg-slate-100/50 border border-slate-200 p-3.5 rounded-2xl text-center text-sm font-bold shadow-inner outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">产品说明 / 备註</label>
                    <textarea 
                      placeholder="输入产品特色、说明回其他备注..."
                      className="w-full bg-slate-100/50 border border-slate-200 p-5 rounded-3xl text-sm outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner font-medium placeholder:text-slate-400 min-h-[120px]"
                      value={addNote}
                      onChange={(e) => setAddNote(e.target.value)}
                    />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
};
