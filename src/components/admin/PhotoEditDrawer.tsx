import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, RefreshCcw, ChevronRight, Eye, EyeOff, Search, Sparkles } from 'lucide-react';
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
  addModelNumber: string;
  setAddModelNumber: (num: string) => void;
  addDimL: string;
  setAddDimL: (l: string) => void;
  addDimW: string;
  setAddDimW: (w: string) => void;
  addDimH: string;
  setAddDimH: (h: string) => void;
  addDimensions: any[];
  setAddDimensions: (dims: any[]) => void;
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
  updateTag: (id: string, name: string) => void;
  deleteTag: (id: string) => void;
  photos: Photo[];
  manufacturers: any[];
  editPhotoPreview?: string | null;
  onDelete?: (id: string) => void;
  newPhotoData?: string | null;
  aiDebugInfo: { step: string; message: string; error?: string } | null;
  isAnalyzing?: boolean;
  abortAnalysis?: () => void;
  handleSingleAiAnalyze?: (data: string, catId?: string) => Promise<void>;
}

export const PhotoEditDrawer: React.FC<Props> = (props) => {
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [managingTag, setManagingTag] = useState<any | null>(null);
  const [isLongPress, setIsLongPress] = useState(false);

  const sortedTags = useMemo(() => {
    return [...props.tags];
  }, [props.tags]);
  
  const handleTagClick = (tag: any) => {
    if (isLongPress) return;
    if (props.addTagIds.includes(tag.id)) {
        props.setAddTagIds(props.addTagIds.filter(id => id !== tag.id));
    } else if (props.addTagIds.length < 3) {
        props.setAddTagIds([...props.addTagIds, tag.id]);
    }
  };

  const handlePointerDown = (tag: any) => {
    setIsLongPress(false);
    if (longPressTimer) clearTimeout(longPressTimer);
    setLongPressTimer(setTimeout(() => {
        setIsLongPress(true);
        setManagingTag(tag);
    }, 600));
  };

  const handlePointerUp = () => {
    if (longPressTimer) clearTimeout(longPressTimer);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col pt-safe">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm">
        <button onClick={props.resetAddState} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors rounded-full active:bg-slate-100">
          <X size={24} />
        </button>
        {props.aiDebugInfo?.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-[10px] font-bold max-w-[50%] animate-pulse">
            AI 错误: {props.aiDebugInfo.error}
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
        <div className="flex items-center gap-2">
            {props.handleSingleAiAnalyze && (
              <div className="flex items-center gap-2">
                {props.isAnalyzing && props.abortAnalysis && (
                  <button 
                    onClick={props.abortAnalysis}
                    className="p-2.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 shadow-sm active:scale-95"
                    title="取消识别"
                  >
                    <X size={18} />
                  </button>
                )}
                <button 
                  onClick={() => {
                    if (props.isAnalyzing) return;
                    const data = props.newPhotoData || props.editPhotoPreview;
                    if (data) props.handleSingleAiAnalyze!(data, props.addCatId || undefined);
                  }}
                  disabled={props.isAnalyzing && !props.abortAnalysis}
                  className={`p-2.5 rounded-xl border shadow-sm transition-all active:scale-95 ${props.isAnalyzing ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed' : 'bg-purple-50 text-purple-600 border-purple-100'}`}
                >
                  {props.isAnalyzing ? <RefreshCcw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                </button>
              </div>
            )}
            <button 
              onClick={props.saveNewPhoto}
              className={`bg-blue-600 text-white px-6 py-2.5 rounded-2xl text-xs font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-[0.95] flex items-center gap-2 ${props.isSyncing ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {props.isSyncing ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14}/>}
              保存
            </button>
        </div>
      </div>

       <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-32">
        <div className="flex gap-4 items-start">
          {(props.newPhotoData || props.editPhotoPreview) && (
            <div className="w-1/3 shrink-0">
               <div className="aspect-square rounded-2xl overflow-hidden bg-slate-900 shadow-lg border-2 border-white">
                  <img src={props.newPhotoData || props.editPhotoPreview || undefined} className="w-full h-full object-contain" alt="Preview" />
               </div>
            </div>
          )}
          <div className="flex-1 space-y-3">
             <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">编号 / Code</h3>
                  <input type="text" placeholder="编号..." value={props.addManualCode} onChange={e => props.setAddManualCode(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 text-sm" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">型号 / Model</h3>
                  <input type="text" placeholder="型号..." value={props.addModelNumber} onChange={e => props.setAddModelNumber(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 text-sm" />
                </div>
             </div>
             <div className="space-y-1">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">产品名称 / Product Name</h3>
                <input type="text" placeholder="输入名称..." value={props.addName} onChange={e => props.setAddName(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-bold" />
             </div>
          </div>
        </div>

        <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">目录 / Category *</h3>
            <div className="grid grid-cols-4 gap-1.5">
                {props.dbCategories.map(cat => (
                  <button 
                    key={cat.code}
                    onClick={() => { props.setAddCatId(cat.code); }}
                    className={`flex flex-col items-center justify-center py-4 px-1 rounded-xl border-2 transition-all active:scale-[0.95] ${props.addCatId === cat.code ? 'bg-blue-50 border-blue-600 shadow-md shadow-blue-600/10' : 'bg-white border-slate-100'}`}
                  >
                    <span className={`font-black text-sm leading-tight text-center ${props.addCatId === cat.code ? 'text-blue-700' : 'text-slate-700'}`}>{cat[props.appLang] || cat.zh}</span>
                  </button>
                ))}
            </div>
        </div>

        <section className="space-y-2">
            <div className="flex items-center justify-between pl-1">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">标签 / Tags</h3>
                <button onClick={props.quickAddTag} className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">+ 新增 / NEW</button>
            </div>
             <div className="flex flex-wrap gap-1.5 pb-1 max-h-32 overflow-y-auto content-start">
                {sortedTags.map(tag => (
                  <button 
                    key={tag.id}
                    onPointerDown={() => handlePointerDown(tag)}
                    onPointerUp={handlePointerUp}
                    onClick={() => handleTagClick(tag)}
                    onPointerCancel={() => { if (longPressTimer) clearTimeout(longPressTimer); }}
                    onContextMenu={(e) => e.preventDefault()}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${props.addTagIds.includes(tag.id) ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    #{tag.name}
                  </button>
                ))}

             </div>

             <AnimatePresence>
                {managingTag && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-6 backdrop-blur-sm"
                        onClick={() => setManagingTag(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-8 space-y-6 text-center">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-slate-800">管理标签 / Manage</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">#{managingTag.name}</p>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    <button 
                                        onClick={() => {
                                            const newName = prompt("输入新名称:", managingTag.name);
                                            if (newName && newName !== managingTag.name) {
                                                props.updateTag(managingTag.id, newName);
                                            }
                                            setManagingTag(null);
                                        }}
                                        className="w-full py-4 bg-blue-50 text-blue-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors"
                                    >
                                        修改名称 (Edit Name)
                                    </button>
                                    <button 
                                        onClick={() => {
                                            if (confirm(`确定删除标签 #${managingTag.name}?`)) {
                                                props.deleteTag(managingTag.id);
                                            }
                                            setManagingTag(null);
                                        }}
                                        className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                                    >
                                        立即删除 (Delete Tag)
                                    </button>
                                    <button 
                                        onClick={() => setManagingTag(null)}
                                        className="w-full py-4 bg-slate-50 text-slate-500 rounded-2xl font-bold transition-colors"
                                    >
                                        取消 (Cancel)
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
             </AnimatePresence>
          </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">厂商 / Manufacturer</h3>
            <button onClick={props.quickAddManufacturer} className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">+ 新增</button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto content-start">
            {props.manufacturers.map((mfr: any) => (
              <button 
                key={mfr.id}
                onClick={() => props.setAddSubId(mfr.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${props.addSubId === mfr.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-600'}`}
              >
                {mfr.name}
              </button>
            ))}
          </div>
        </section>

          <section className="space-y-3">
             <button 
               onClick={() => props.setShowOtherFields(!props.showOtherFields)}
               className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 active:scale-[0.98] transition-all"
             >
               <span>其他 / Others (尺寸、说明、备注)</span>
               <div className={`transition-transform ${props.showOtherFields ? 'rotate-90' : ''}`}>
                  <ChevronRight size={16} />
               </div>
             </button>
             
             {props.showOtherFields && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between pl-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 leading-none">产品尺寸 / DIMENSIONS</span>
                    <button 
                      onClick={() => {
                        const newDims = [...(props.addDimensions || [])];
                        newDims.push({ label: '', length: 0, width: 0, height: 0, unit: 'cm' });
                        props.setAddDimensions(newDims);
                      }}
                      className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100"
                    >
                      + 增加规格 / ADD SIZE
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(props.addDimensions && props.addDimensions.length > 0 ? props.addDimensions : [{ label: '', length: parseFloat(props.addDimL)||0, width: parseFloat(props.addDimW)||0, height: parseFloat(props.addDimH)||0, unit: 'cm' }]).map((dim, idx) => (
                      <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 relative">
                        { (props.addDimensions && props.addDimensions.length > 1) && (
                          <button 
                            onClick={() => {
                              props.setAddDimensions(props.addDimensions.filter((_, i) => i !== idx));
                            }}
                            className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                           <div className="space-y-1">
                              <div className="flex items-center justify-between pl-1">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">规格名称 / Label</span>
                                {dim.isAI && <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">AI</span>}
                              </div>
                              <input 
                                type="text" 
                                placeholder="如: 3-Seater" 
                                value={dim.label || ''} 
                                onChange={e => {
                                  const newDims = [...((props.addDimensions && props.addDimensions.length > 0) ? props.addDimensions : [{...dim}])];
                                  newDims[idx].label = e.target.value;
                                  props.setAddDimensions(newDims);
                                }}
                                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold" 
                              />
                           </div>
                           <div className="space-y-1">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter pl-1">单位 / Unit</span>
                              <div className="flex gap-1">
                                {['cm', 'inch'].map(u => (
                                  <button 
                                    key={u}
                                    onClick={() => {
                                      const newDims = [...((props.addDimensions && props.addDimensions.length > 0) ? props.addDimensions : [{...dim}])];
                                      newDims[idx].unit = u;
                                      newDims[idx].isAI = false;
                                      props.setAddDimensions(newDims);
                                    }}
                                    className={`flex-1 p-2 rounded-xl text-[10px] font-bold transition-all border ${dim.unit === u ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}
                                  >
                                    {u}
                                  </button>
                                ))}
                              </div>
                           </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                             <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter pl-1">长 / L</span>
                             <input 
                               type="number" 
                               value={dim.length || ''} 
                               onChange={e => {
                                 const curDims = props.addDimensions;
                                 const newDims = [...((curDims && curDims.length > 0) ? curDims : [{...dim}])];
                                 newDims[idx].length = parseFloat(e.target.value) || 0;
                                 props.setAddDimensions(newDims);
                                 if (idx === 0) props.setAddDimL(e.target.value);
                               }}
                               className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-center font-bold text-sm" 
                             />
                          </div>
                          <div className="space-y-1">
                             <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter pl-1">宽 / W</span>
                             <input 
                               type="number" 
                               value={dim.width || ''} 
                               onChange={e => {
                                 const curDims = props.addDimensions;
                                 const newDims = [...((curDims && curDims.length > 0) ? curDims : [{...dim}])];
                                 newDims[idx].width = parseFloat(e.target.value) || 0;
                                 props.setAddDimensions(newDims);
                                 if (idx === 0) props.setAddDimW(e.target.value);
                               }}
                               className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-center font-bold text-sm" 
                             />
                          </div>
                          <div className="space-y-1">
                             <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter pl-1">高 / H</span>
                             <input 
                               type="number" 
                               value={dim.height || ''} 
                               onChange={e => {
                                 const curDims = props.addDimensions;
                                 const newDims = [...((curDims && curDims.length > 0) ? curDims : [{...dim}])];
                                 newDims[idx].height = parseFloat(e.target.value) || 0;
                                 props.setAddDimensions(newDims);
                                 if (idx === 0) props.setAddDimH(e.target.value);
                               }}
                               className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-center font-bold text-sm" 
                             />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <textarea placeholder="备注信息..." value={props.addNote} onChange={e => props.setAddNote(e.target.value)} className="w-full p-4 rounded-2xl border border-slate-200 h-24" />

               </div>
             )}
          </section>

           {props.editPhotoId && props.onDelete && (
            <div className="pt-4 pb-8 space-y-4">
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
