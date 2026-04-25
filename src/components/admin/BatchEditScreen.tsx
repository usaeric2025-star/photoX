import React from 'react';
import { X, RefreshCcw, ChevronRight, EyeOff, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const BatchEditScreen = ({
  resetAddState,
  isSyncing,
  saveBatchEdit,
  batchEditIds,
  dbCategories,
  categories,
  appLang,
  addCatId,
  setAddCatId,
  addSubId,
  setAddSubId,
  quickAddSubCategory,
  tags,
  quickAddTag,
  quickAddManufacturer,
  addTagIds,
  setAddTagIds,
  addNote,
  setAddNote,
  showOtherFields,
  setShowOtherFields,
  addManualCode,
  setAddManualCode,
  addDimL,
  setAddDimL,
  addDimW,
  setAddDimW,
  addDimH,
  setAddDimH,
  addIsHidden,
  setAddIsHidden,
  batchIsHiddenApplied,
  setBatchIsHiddenApplied,
  manufacturers,
}: any) => {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col pt-safe">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm">
        <button onClick={resetAddState} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors rounded-full active:bg-slate-100">
          <X size={24} />
        </button>
        <div className="flex flex-col items-center">
            <h2 className="font-bold text-lg text-slate-800 ml-1 tracking-tight leading-tight">批量修改 ({batchEditIds?.length})</h2>
            <div 
              onClick={() => {
                setBatchIsHiddenApplied(true);
                setAddIsHidden(!addIsHidden);
              }}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all cursor-pointer mt-1 ${batchIsHiddenApplied ? (addIsHidden ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-green-50 border-green-200 text-green-600') : 'bg-slate-50 border-slate-200 text-slate-400'}`}
            >
              {!batchIsHiddenApplied ? <div className="w-2 h-2 rounded-full bg-slate-300" /> : (addIsHidden ? <EyeOff size={10} /> : <Eye size={10} />)}
              <span className="text-[8px] font-bold uppercase tracking-widest">{!batchIsHiddenApplied ? '未套用公開狀態' : (addIsHidden ? '設為屏蔽' : '設為公開')}</span>
            </div>
        </div>
        <button 
          onClick={() => saveBatchEdit(batchIsHiddenApplied)}
          className={`bg-blue-600 text-white px-6 py-2.5 rounded-2xl text-xs font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-[0.95] flex items-center gap-2 ${isSyncing ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {isSyncing ? <RefreshCcw size={14} className="animate-spin" /> : null}
          套用修改
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-32">
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-3xl">
          <p className="text-[11px] text-blue-700 font-medium leading-relaxed flex items-start gap-2">
            <span className="shrink-0 w-1.5 h-1.5 bg-blue-500 rounded-full mt-1"></span>
            注意：這會更新所有選中照片。僅手動修改的欄位會被套用至所有選取項目。
          </p>
        </div>

        <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">目標主分類 *</h3>
          <div className="grid grid-cols-2 gap-3">
            {dbCategories.map((cat: any) => (
              <button 
                key={cat.code}
                onClick={() => { setAddCatId(cat.code); }}
                className={`p-4 rounded-3xl border-2 text-left transition-all active:scale-[0.98] ${addCatId === cat.code ? 'bg-white border-blue-600 text-blue-600 shadow-xl shadow-blue-600/5' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}
              >
                <span className="font-bold block text-sm tracking-tight">{cat[appLang] || cat.zh}</span>
                <span className="text-[9px] uppercase tracking-wider opacity-60 font-mono">{cat.en}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">廠商 (Manufacturer)</h3>
            <button onClick={quickAddManufacturer} className="text-[10px] text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-full active:scale-95 transition-transform">+ 新增</button>
          </div>
          <div className="flex flex-wrap gap-2 p-1">
            {manufacturers?.map((mfr: any) => (
              <button 
                key={mfr.id}
                onClick={() => setAddSubId(mfr.id)}
                className={`px-5 py-2.5 rounded-full border text-xs font-bold transition-all active:scale-[0.97] ${addSubId === mfr.id ? 'bg-slate-800 border-slate-800 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}
              >
                {mfr.name}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">統一風格標籤</h3>
            <button onClick={quickAddTag} className="text-[10px] text-purple-600 font-bold bg-purple-50 px-3 py-1 rounded-full active:scale-95 transition-transform">+ 新增</button>
          </div>
          <div className="flex flex-wrap gap-2 p-1">
            {tags.map((tag: any) => (
              <button 
                key={tag.id}
                onClick={() => setAddTagIds((prev: string[]) => prev.includes(tag.id) ? prev.filter((tid: string) => tid !== tag.id) : [...prev, tag.id])}
                className={`px-4 py-2 rounded-full border text-xs font-bold transition-all active:scale-[0.97] ${addTagIds.includes(tag.id) ? 'bg-purple-500 border-purple-500 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}
              >
                #{tag.name}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">統一產品備註</h3>
            <textarea 
              placeholder="輸入統一修改的備註內容..."
              className="w-full bg-slate-100/50 border border-slate-200 p-5 rounded-3xl text-sm outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner font-medium min-h-[100px]"
              value={addNote}
              onChange={(e) => setAddNote(e.target.value)}
            />
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
              <span>其他詳細資訊 (編號、尺寸)</span>
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
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">統一產品編號</label>
                  <input 
                    type="text" 
                    placeholder="輸入編號 (例如: SK-2024)..."
                    value={addManualCode}
                    onChange={(e) => setAddManualCode(e.target.value)}
                    className="w-full bg-slate-100/50 border border-slate-200 p-4 rounded-3xl text-sm outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner font-medium"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">統一尺寸 (長 x 寬 x 高) cm</label>
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
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
};
