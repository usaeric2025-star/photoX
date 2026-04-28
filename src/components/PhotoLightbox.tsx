import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, MessageCircle, Key, Layers, Maximize, Edit3, Eye, EyeOff, Sparkles } from 'lucide-react';
import { Photo, Category } from '../types';

interface PhotoLightboxProps {
  photo: Photo | null;
  displayPhotos: Photo[];
  index: number | null;
  onClose: () => void;
  onPrev: (e?: React.MouseEvent) => void;
  onNext: (e?: React.MouseEvent) => void;
  t: any;
  lang: string;
  categories: Category[];
  manufacturers: any[];
  tagMap: Record<string, string>;
  isAdminMode: boolean;
  isStaffMode: boolean;
  contactWhatsApp: (photo: Photo) => void;
  onUngroup?: (photoId: string) => void;
  onSetGroupCover?: (photoId: string, groupId: string) => void;
  onEditPhoto?: (photo: Photo) => void;
  onToggleHidden?: (photo: Photo) => void;
  onAiAnalyze?: (photo: Photo) => void;
  onCancelAnalyze?: () => void;
  isAnalyzing?: boolean;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  photo, displayPhotos, index, onClose, onPrev, onNext, t, lang, categories, manufacturers, tagMap,
  isAdminMode, isStaffMode, contactWhatsApp, onUngroup, onSetGroupCover, onEditPhoto, onToggleHidden,
  onAiAnalyze, onCancelAnalyze, isAnalyzing
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'specs'>('info');

  const [isImageLoading, setIsImageLoading] = useState(true);

  useEffect(() => {
    setIsImageLoading(true);
  }, [photo?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onPrev();
      else if (e.key === 'ArrowRight') onNext();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPrev, onNext, onClose]);

  // Swipe support
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  // Tags lookup
  const displayTags = React.useMemo(() => {
    if (!photo || !photo.tagIds || photo.tagIds.length === 0) return [];
    // Only show tags present in the tagMap
    return photo.tagIds
      .map(tid => tagMap[String(tid)])
      .filter((tagName): tagName is string => !!tagName && tagName.trim() !== '');
  }, [photo?.id, photo?.tagIds, tagMap]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) onNext();
    if (isRightSwipe) onPrev();
  };

  if (index === null || !photo) return null;

  // Header/Meta info calculation
  const catId = photo.categoryId;
  
  const activeCat = categories.find(c => String(c.id) === String(catId));
  let catName = '';
  if (activeCat) {
     if (lang === 'zh') catName = activeCat.zh || activeCat.name;
     else if (lang === 'en') catName = activeCat.en || activeCat.name || activeCat.zh;
     else if (lang === 'ms') catName = activeCat.ms || activeCat.name || activeCat.en || activeCat.zh;
     else catName = activeCat.name;
  }

  // Manufacturer lookup
  const subId = photo.subcategoryId;
  const mfr = manufacturers && subId ? manufacturers.find(m => m.id === subId) : null;
  const mfrName = mfr ? mfr.name : null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] bg-white flex flex-col md:flex-row overflow-hidden"
    >
      {/* --- 左侧/上方：图片展示区 --- */}
      <div 
        className="relative flex-1 bg-black flex items-center justify-center h-[40vh] md:h-full"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          {isAdminMode && (
            <button 
              onClick={() => {
                onClose();
                onEditPhoto?.(photo);
              }}
              className="w-10 h-10 bg-black/20 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/40 transition-all"
              title="编辑此照片"
            >
              <Edit3 size={20} />
            </button>
          )}
          <button onClick={onClose} className="w-10 h-10 bg-black/20 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/40 transition-all">
            <X size={20} />
          </button>
        </div>

        {isImageLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          </div>
        )}
        <img 
          key={photo.id}
          src={photo.image_url || photo.uri || ''} 
          alt={photo.name}
          className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={() => setIsImageLoading(false)}
        />

        {/* 翻页按钮 - 桌面端显示在图片两侧 */}
        <div className="absolute inset-y-0 left-0 w-16 hidden md:flex items-center justify-start pl-4 z-20 group cursor-pointer" onClick={onPrev}>
          <div className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all">
            <ChevronLeft size={24} />
          </div>
        </div>
        <div className="absolute inset-y-0 right-0 w-16 hidden md:flex items-center justify-start pr-4 z-20 group cursor-pointer" onClick={onNext}>
          <div className="flex w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full items-center justify-center text-white transition-all ml-auto">
            <ChevronRight size={24} />
          </div>
        </div>
      </div>

      {/* --- 右侧/下方：信息详情区 --- */}
      <div className="w-full md:w-[400px] flex flex-col bg-white overflow-y-auto no-scrollbar shadow-2xl z-10">
        <div className="p-5 pb-24 md:pb-6 space-y-5">
           {/* 1. 标题与动作条 */}
           <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">{catName || t.uncategorized}</p>
                <h2 className="text-xl font-black text-[#1D3557] leading-tight uppercase">
                  {photo.name || t.unnamed}
                </h2>
              </div>
              {isAdminMode && (
                <div className="flex items-center gap-2">
                  {onToggleHidden && (
                    <button 
                      onClick={() => onToggleHidden(photo)}
                      className={`p-2 rounded-full border transition-all ${photo.isHidden ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-green-50 border-green-200 text-green-600'}`}
                    >
                      {photo.isHidden ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  )}
                </div>
              )}
           </div>

           {/* 2. 价格与型号 - 核心信息 */}
           <div className="flex flex-wrap items-center gap-3">
              {photo.price && (
                <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl shadow-md">
                  <span className="text-[10px] font-bold uppercase tracking-widest block opacity-70 mb-0.5">{t.price}</span>
                  <p className="text-xl font-bold leading-none">{photo.price}</p>
                </div>
              )}
              {photo.model_number && (
                <div className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">{t.modelNumber}</span>
                  <p className="font-mono font-bold text-slate-700">{photo.model_number}</p>
                </div>
              )}
           </div>

           {/* 3. 核心功能按钮 - WhatsApp 咨询 (高亮显示在最显眼处) */}
           <button 
             onClick={() => {
                (window as any)._pendingPhoto = photo;
                contactWhatsApp(photo);
              }}
             className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-green-200 transition-all active:scale-[0.98]"
           >
             <MessageCircle size={20} fill="currentColor" />
             {t.whatsAppInquiry}
           </button>


           {/* Admin Group Controls */}
           {isAdminMode && photo.groupId && (
             <div className="grid grid-cols-2 gap-2 mt-4">
                  <button 
                    onClick={() => onUngroup?.(photo.id)}
                    className="bg-red-50 text-red-600 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border border-red-100"
                  >
                    {t.ungroup || 'Ungroup'}
                  </button>
                  <button 
                    onClick={() => onSetGroupCover?.(photo.id, photo.groupId!)}
                    className={`py-2 rounded-xl text-xs font-bold uppercase tracking-widest border ${photo.isGroupCover ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-600 border-blue-100'}`}
                  >
                    {t.setCover || 'Set Cover'}
                  </button>
             </div>
           )}

           {/* 4. 描述内容 */}
           {photo.description && (
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.description || 'Description'}</h3>
                  <div className="flex items-center gap-1 bg-purple-50 text-purple-500 px-1.5 py-0.5 rounded uppercase text-[8px] font-black tracking-wider">
                    <Sparkles size={8} /> AI
                  </div>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                  {photo.description}
                </p>
             </div>
           )}

           {/* 5. 分类标签页 - 处理尺寸等详细信息 */}
           <div className="space-y-4 pt-2 border-t border-slate-100">
             <div className="flex gap-4">
                <button 
                  onClick={() => setActiveTab('info')}
                  className={`text-xs font-black uppercase tracking-widest pb-2 border-b-2 transition-all ${activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-300'}`}
                >
                  {t.details || 'DETAILS'}
                </button>
                <button 
                  onClick={() => setActiveTab('specs')}
                  className={`text-xs font-black uppercase tracking-widest pb-2 border-b-2 transition-all ${activeTab === 'specs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-300'}`}
                >
                  {t.dimensions || 'SPECS'}
                </button>
             </div>

             {activeTab === 'info' ? (
                <div className="space-y-4">
                   {/* 厂商 */}
                   {(mfrName && mfrName !== catName) && (
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.manufacturer}</h3>
                      <span className="bg-orange-50 text-orange-600 px-3 py-1 border border-orange-200 rounded-full text-xs font-bold inline-block">
                        <Key size={10} className="inline-block mr-1.5" />
                        {mfrName}
                      </span>
                    </div>
                   )}

                   {/* 标签 */}
                   {displayTags.length > 0 && (
                      <div>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.tags}</h3>
                        <div className="flex flex-wrap gap-2">
                           {displayTags.map((tagName: string, i: number) => (
                             <span key={i} className="bg-slate-50 text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight border border-slate-200">#{tagName}</span>
                           ))}
                        </div>
                      </div>
                   )}
                   
                   {/* 内部私有信息 (Staff/Admin ONLY) */}
                   {(isAdminMode || isStaffMode) && photo.manual_code && (
                     <div className="bg-red-50 border border-red-100 p-3 rounded-xl">
                       <h3 className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Internal Reference</h3>
                       <p className="font-mono font-black text-red-600 tracking-wider uppercase">{photo.manual_code}</p>
                     </div>
                   )}
                </div>
             ) : (
                <div className="grid grid-cols-2 gap-3">
                   {/* 尺寸详情 */}
                   {Array.isArray(photo.dimensions) && photo.dimensions.length > 0 ? (
                     photo.dimensions.map((dim: any, i: number) => (
                       <div key={i} className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
                          <p className="font-black text-slate-800 text-sm">{dim.label || `Dimension ${i + 1}`}</p>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                               <span className="text-[9px] font-bold text-slate-400 uppercase block">L</span>
                               <p className="font-bold text-slate-700 text-sm">{dim.length || '-'}</p>
                            </div>
                            <div>
                               <span className="text-[9px] font-bold text-slate-400 uppercase block">W</span>
                               <p className="font-bold text-slate-700 text-sm">{dim.width || '-'}</p>
                            </div>
                            <div>
                               <span className="text-[9px] font-bold text-slate-400 uppercase block">H</span>
                               <p className="font-bold text-slate-700 text-sm">{dim.height || '-'}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-1 uppercase">{dim.unit || 'cm'}</span>
                       </div>
                     ))
                   ) : (
                     <p className="text-slate-300 text-[10px] italic col-span-2 py-4">No size data recorded.</p>
                   )}
                </div>
             )}
           </div>
        </div>
      </div>

      {/* 底部悬浮页码/切换 - 仅移动端 */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 md:hidden z-20">
         <button onClick={onPrev} className="w-12 h-12 bg-black/60 backdrop-blur-md text-white rounded-full flex items-center justify-center shadow-lg border border-white/10">
           <ChevronLeft size={24} />
         </button>
         <div className="px-4 py-2 bg-black/60 backdrop-blur-md text-white text-xs font-black rounded-full shadow-lg border border-white/10 min-w-[60px] text-center">
           {index + 1} / {displayPhotos.length}
         </div>
         <button onClick={onNext} className="w-12 h-12 bg-black/60 backdrop-blur-md text-white rounded-full flex items-center justify-center shadow-lg border border-white/10">
           <ChevronRight size={24} />
         </button>
      </div>
    </motion.div>
  );
};
