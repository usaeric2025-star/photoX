import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, MessageCircle, Key, Layers, Maximize, Edit3, Eye, EyeOff, Sparkles, BookOpen } from 'lucide-react';
import { Photo, Category, ProductGroup } from '../types';

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
  const [isZoomed, setIsZoomed] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [groupData, setGroupData] = useState<ProductGroup | null>(null);
  const [activeLang, setActiveLang] = useState<string>(lang || 'zh');

  useEffect(() => {
    setActiveLang(lang || 'zh');
  }, [lang]);

  useEffect(() => {
    setIsImageLoading(true);
    setIsZoomed(false);
    
    // Fetch group context if part of a group
    if (photo?.groupId) {
      import('../services/groupService').then(m => {
        m.getGroupById(photo.groupId!).then(data => {
          setGroupData(data);
        });
      });
    } else {
      setGroupData(null);
    }
  }, [photo?.id, photo?.groupId]);

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
  const subId = photo.manufacturerId;
  const mfr = manufacturers && subId ? manufacturers.find(m => m.id === subId) : null;
  const mfrName = mfr ? mfr.name : null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[500] bg-white flex ${isZoomed ? 'flex-col' : 'flex-col md:flex-row'} overflow-hidden`}
    >
      {/* --- 左侧/上方：图片展示区 --- */}
      <div 
        className={`relative ${isZoomed ? 'flex-1' : 'flex-none md:flex-1'} bg-black flex items-center justify-center h-[42vh] md:h-full`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          {isAdminMode && (
            <>
              <button 
                onClick={() => {
                  onClose();
                  onEditPhoto?.(photo!);
                }}
                className="w-10 h-10 bg-black/20 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/40 transition-all"
                title="编辑此照片"
              >
                <Edit3 size={20} />
              </button>
            </>
          )}
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsZoomed(!isZoomed);
            }} 
            className="w-10 h-10 bg-black/20 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/40 transition-all"
            title="缩放"
          >
            <Maximize size={20} />
          </button>
          <button onClick={onClose} className="w-10 h-10 bg-black/20 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/40 transition-all">
            <X size={20} />
          </button>
        </div>

        {isImageLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          </div>
        )}
        <div className={`relative w-full h-full flex items-center justify-center overflow-hidden`}>
          <motion.img 
            key={photo.id}
            src={photo.image_url || photo.uri || ''} 
            alt={photo.name}
            className={`w-full h-full object-contain transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
            onLoad={() => setIsImageLoading(false)}
          />
        </div>

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

      {!isZoomed && (
        <div className="w-full md:w-[450px] flex flex-col bg-white overflow-hidden shadow-2xl z-10 relative">
          <div className="flex-1 overflow-y-auto no-scrollbar p-4 pb-24 md:pb-6 space-y-4">
             {/* 1. 标题与动作条 */}
             <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">{catName || t.uncategorized}</p>
                  <h2 className="text-lg font-black text-[#1D3557] leading-tight uppercase">
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

             {/* 2. 价格与型号组合 */}
             {(photo.price || photo.model_number) && (
               <div className="flex flex-wrap items-stretch gap-3">
                  {photo.price && (
                    <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl shadow-md flex-1 min-w-[120px]">
                      <span className="text-[10px] font-bold uppercase tracking-widest block opacity-70 mb-0.5">{t.price}</span>
                      <p className="text-xl font-bold leading-none">{photo.price}</p>
                    </div>
                  )}
                  {photo.model_number && (
                    <div className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-2xl flex-1 min-w-[120px] flex flex-col justify-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">{t.modelNumber}</span>
                      <p className="font-mono font-bold text-slate-700">{photo.model_number}</p>
                    </div>
                  )}
               </div>
             )}

             {/* 3. 厂商与标签 */}
             {((mfrName && mfrName !== catName) || displayTags.length > 0) && (
               <div className="flex flex-wrap items-center gap-2">
                  {(mfrName && mfrName !== catName) && (
                    <span className="bg-orange-50 text-orange-600 px-2.5 py-1 border border-orange-200 rounded-lg text-xs font-bold flex items-center">
                      <Key size={10} className="mr-1.5" />
                      {mfrName}
                    </span>
                  )}
                  {displayTags.map((tagName: string, i: number) => (
                    <span key={i} className="bg-slate-50 text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight border border-slate-200">#{tagName}</span>
                  ))}
               </div>
             )}

             {/* Admin Group Controls */}
             {isAdminMode && photo.groupId && (
               <div className="grid grid-cols-2 gap-2 mt-2">
                    <button 
                      onClick={() => onUngroup?.(photo.id)}
                      className="bg-red-50 text-red-600 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-red-100"
                    >
                      {t.ungroup || 'Ungroup'}
                    </button>
                    <button 
                      onClick={() => onSetGroupCover?.(photo.id, photo.groupId!)}
                      className={`py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${photo.isGroupCover ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-600 border-blue-100'}`}
                    >
                      {t.setCover || 'Set Cover'}
                    </button>
               </div>
             )}

             {/* 4. 尺寸详情 */}
             {Array.isArray(photo.dimensions) && photo.dimensions.length > 0 && (
               <div className="space-y-2">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.dimensions || 'Dimensions'}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {photo.dimensions.map((dim: any, i: number) => {
                      const hasVolumeParams = dim.length || dim.width || dim.height;
                      const isQuickLabel = dim.label && !hasVolumeParams && dim.unit;
                      
                      if (isQuickLabel) {
                        return (
                          <div key={i} className="bg-slate-50 p-2.5 border border-slate-100 rounded-xl flex items-center justify-between col-span-2">
                            <p className="font-bold text-slate-700 text-sm">{dim.label}</p>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">{dim.unit}</span>
                          </div>
                        )
                      }
                      
                      return (
                          <div key={i} className="bg-slate-50 p-3 rounded-xl space-y-2 border border-slate-100 col-span-2 sm:col-span-1">
                            {dim.label && <p className="font-black text-slate-600 text-xs">{dim.label}</p>}
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
                      )
                    })}
                  </div>
               </div>
             )}

             {/* 5. 描述内容 - 优先显示个人描述 */}
             {(photo.description || (groupData && (groupData.description || groupData.description_translations))) && (
               <div className="space-y-4">
                  {/* Language Switcher for Description */}
                  <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                      {[
                        { key: 'zh', label: '中文' },
                        { key: 'en', label: 'EN' },
                        { key: 'ms', label: 'BM' }
                      ].map(l => (
                        <button
                          key={l.key}
                          onClick={() => setActiveLang(l.key)}
                          className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${
                            activeLang === l.key 
                              ? 'bg-white text-blue-600 shadow-sm' 
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {l.label}
                        </button>
                      ))}
                  </div>

                  {/* Photo Description if exists */}
                  {(photo.description_translations?.[activeLang as 'zh'|'en'|'ms'] || (activeLang === 'zh' && photo.description)) && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.description || 'Description'}</h3>
                        <div className="flex items-center gap-1 bg-purple-50 text-purple-500 px-1.5 py-0.5 rounded uppercase text-[8px] font-black tracking-wider">
                          <Sparkles size={8} /> AI
                        </div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm min-h-[60px]">
                        <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                          {photo.description_translations?.[activeLang as 'zh'|'en'|'ms'] || (activeLang === 'zh' ? photo.description : '')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Group Story (Series Story) if exists and photo is in group */}
                  {groupData && (groupData.description_translations?.[activeLang as 'zh'|'en'|'ms'] || (activeLang === 'zh' && groupData.description)) && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-3 bg-blue-600 rounded-full" />
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.seriesStory || 'Series Context'}</h3>
                      </div>
                      <div className="bg-white p-4 rounded-xl border-l-[3px] border-blue-500 shadow-md">
                        <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap italic opacity-80">
                          {groupData.description_translations?.[activeLang as 'zh'|'en'|'ms'] || (activeLang === 'zh' ? groupData.description : '')}
                        </p>
                      </div>
                    </div>
                  )}
               </div>
             )}

             {/* 内部私有信息 (Staff/Admin ONLY) */}
             {(isAdminMode || isStaffMode) && photo.manual_code && (
               <div className="bg-red-50 border border-red-100 p-3 rounded-xl mt-4">
                 <h3 className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Internal Reference</h3>
                 <p className="font-mono font-black text-red-600 tracking-wider uppercase">{photo.manual_code}</p>
               </div>
             )}
          </div>

          {/* 底部悬浮动作区域 */}
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 bg-gradient-to-t from-white via-white to-transparent pointer-events-none sticky bottom-0">
             <button 
               onClick={(e) => {
                  e.stopPropagation();
                  (window as any)._pendingPhoto = photo;
                  contactWhatsApp(photo);
                }}
               className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-3 flex-none rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_8px_30px_rgb(37,211,102,0.3)] pointer-events-auto transition-transform active:scale-[0.98]"
             >
               <MessageCircle size={20} fill="currentColor" />
               {t.whatsAppInquiry}
             </button>
          </div>
        </div>
      )}

      {/* 顶部悬浮页码/切换 - 仅移动端 */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 flex items-center gap-3 md:hidden z-[600] whitespace-nowrap">
         <button onClick={onPrev} className="w-10 h-10 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center shadow-lg border border-white/10 active:scale-90 transition-transform">
           <ChevronLeft size={20} />
         </button>
         <div className="px-3 py-1.5 bg-black/40 backdrop-blur-md text-white text-[10px] font-black rounded-full shadow-lg border border-white/10 min-w-[60px] text-center">
           {index + 1} / {displayPhotos.length}
         </div>
         <button onClick={onNext} className="w-10 h-10 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center shadow-lg border border-white/10 active:scale-90 transition-transform">
           <ChevronRight size={20} />
         </button>
      </div>
    </motion.div>
  );
};
