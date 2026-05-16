import React, { useState, useEffect } from 'react';
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageCircle, Key, Maximize, Edit3, Eye, EyeOff, Sparkles, Download, ChevronLeft, ChevronRight, Share2, Check, RefreshCcw } from 'lucide-react';
import { Photo, Category, ProductGroup, Manufacturer, Dimension } from '../types';
import { getTranslatedCategoryName, getPhotoDisplayName, getManufacturerName, TranslationType, getCacheBustedImageUrl } from '../lib/ui-helpers';
import { Skeleton } from './ui/Skeleton';

// ... (retain props and other logic)

interface PhotoLightboxProps {
  photo: Photo | null;
  displayPhotos: Photo[];
  index: number | null;
  onClose: () => void;
  onPrev: (e?: React.MouseEvent) => void;
  onNext: (e?: React.MouseEvent) => void;
  t: TranslationType;
  lang: string;
  categories: Category[];
  manufacturers: Manufacturer[];
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
  const [isCopied, setIsCopied] = useState(false);

  if (index === null || !photo) return null;

  const handleShare = () => {
    if (!photo?.image_hash) return;
    const url = `${window.location.origin}/h/${photo.image_hash}`;
    navigator.clipboard.writeText(url).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const slides = React.useMemo(() => {
    return (displayPhotos || [])
      .filter(p => !!p)
      .map(p => ({ src: getCacheBustedImageUrl(p, 'image') }));
  }, [displayPhotos]);

  const handleDownload = async () => {
    const url = photo?.image_url || photo?.uri;
    if (!url) return;
    
    try {
      const response = await fetch(url, { mode: 'cors' });
      const blob = await response.blob();
      const objUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = photo?.name || 'image.jpg';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objUrl);
    } catch (err) {
      console.error('Failed to download:', err);
    }
  };

  const [isGroupDataLoading, setIsGroupDataLoading] = useState(false);

  useEffect(() => {
    setActiveLang(lang || 'zh');
  }, [lang]);

  useEffect(() => {
    setIsImageLoading(true);
    // REMOVED: setIsZoomed(false); // Do not reset zoom when navigating via arrows
    
    // Fetch group context if part of a group
    if (photo?.groupId) {
      setIsGroupDataLoading(true);
      import('../services/groupService').then(m => {
        m.getGroupById(photo.groupId!).then(data => {
          setGroupData(data);
          setIsGroupDataLoading(false);
        }).catch(() => setIsGroupDataLoading(false));
      });
    } else {
      setGroupData(null);
      setIsGroupDataLoading(false);
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
    if (!photo) return [];
    
    // Ensure tagIds is safely handled even if it's not an array
    const rawIds = Array.isArray(photo.tagIds) ? photo.tagIds : [];
    if (rawIds.length === 0) return [];

    return rawIds
      .map(tid => tagMap[String(tid)])
      .filter((tagName): tagName is string => !!tagName && tagName.trim() !== '');
  }, [photo?.id, photo?.tagIds, tagMap]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0]?.clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0]?.clientX);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) onNext();
    if (isRightSwipe) onPrev();
  };

  // Header/Meta info calculation using shared helpers
  const catName = getTranslatedCategoryName(photo.categoryId, categories, activeLang, t);
  const mfrName = getManufacturerName(photo.manufacturerId, manufacturers);
  const photoDisplayName = getPhotoDisplayName(photo, categories, activeLang, t);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[500] bg-brand-bg flex ${isZoomed ? 'flex-col' : 'flex-col md:flex-row'} overflow-hidden`}
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
              setIsZoomed(true);
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

        {/* Progressive Loading Background */}
        <div className="absolute inset-0 z-0">
          <img 
            src={photo.thumb_url || ''} 
            className={`w-full h-full object-contain blur-xl opacity-30 transition-opacity duration-1000 ${isImageLoading ? 'opacity-30' : 'opacity-0'}`}
            aria-hidden="true"
          />
        </div>

        {isImageLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
             <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin mb-4 shadow-xl"></div>
          </div>
        )}
        <div className={`relative w-full h-full flex items-center justify-center overflow-hidden`}>
          {isZoomed ? (
            <Lightbox
              open={isZoomed}
              close={() => setIsZoomed(false)}
              slides={slides}
              index={index || 0}
              plugins={[Zoom]}
              controller={{ closeOnBackdropClick: true }}
              on={{
                view: ({ index: newIndex }) => {
                  if (newIndex > (index || 0)) onNext();
                  else if (newIndex < (index || 0)) onPrev();
                }
              }}
            />
          ) : (
            <>
              {/* Thumbnail Placeholder - Sharp version of what's already in the gallery */}
              <img 
                src={photo.thumb_url || ''}
                className={`absolute inset-0 z-5 object-contain h-full w-full transition-opacity duration-500 ${isImageLoading ? 'opacity-100' : 'opacity-0'}`}
                aria-hidden="true"
              />
              <img 
                key={photo.id}
                referrerPolicy="no-referrer"
                src={getCacheBustedImageUrl(photo, 'image')}
                alt={photo.name || 'Photo'}
                className={`relative z-10 object-contain h-full w-full cursor-pointer transition-all duration-700 ${isImageLoading ? 'opacity-0 scale-105 blur-md' : 'opacity-100 scale-100 blur-0'}`} 
                onLoad={() => {
                  setIsImageLoading(false);
                }}
                onClick={() => setIsZoomed(true)} 
              />
            </>
          )}
        </div>

        {/* 翻页按钮 - 底下 */}
        <div className="absolute bottom-4 left-4 z-20 flex items-center justify-start group cursor-pointer" onClick={onPrev}>
          <div className="w-10 h-10 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all">
            <ChevronLeft size={24} />
          </div>
        </div>
        
        {isAdminMode && (
          <div className="absolute bottom-4 right-16 z-20 flex items-center justify-end group cursor-pointer" onClick={handleDownload}>
            <div className="w-10 h-10 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all">
              <Download size={24} />
            </div>
          </div>
        )}

        <div className="absolute bottom-4 right-4 z-20 flex items-center justify-end group cursor-pointer" onClick={onNext}>
          <div className="flex w-10 h-10 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full items-center justify-center text-white transition-all ml-auto">
            <ChevronRight size={24} />
          </div>
        </div>
      </div>

      {!isZoomed && (
        <motion.div 
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full md:w-[450px] flex flex-col bg-white overflow-hidden shadow-2xl z-10 relative"
        >
          <motion.div 
            key={photo.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 overflow-y-auto no-scrollbar p-4 pb-24 md:pb-6 space-y-4"
          >
            {/* Info Card Content */}
                  {/* 1. 标题与动作条 */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 border-l-[3px] border-brand-gold pl-3">
                      <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] mb-1">{catName || t.uncategorized}</p>
                      <h2 className="text-xl md:text-2xl font-black text-brand-navy leading-tight uppercase tracking-tight">
                        {photoDisplayName}
                      </h2>
                    </div>
                    {isAdminMode && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleShare}
                          className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${isCopied ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                          title="Copy Direct Link"
                        >
                          {isCopied ? <Check size={16} /> : <Share2 size={16} />}
                        </button>
                        <button 
                          onClick={() => {
                            if (isAnalyzing && onCancelAnalyze) {
                              onCancelAnalyze();
                            } else if (!isAnalyzing) {
                              onAiAnalyze?.(photo);
                            }
                          }}
                          className={`w-9 h-9 flex items-center justify-center rounded-xl border border-blue-100 transition-all ${isAnalyzing ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' : 'bg-blue-50 text-blue-600'}`}
                        >
                          {isAnalyzing ? <X size={16} /> : <Sparkles size={16} />}
                        </button>
                        <button 
                          onClick={() => onEditPhoto?.(photo)}
                          className="w-9 h-9 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-xl transition-all"
                        >
                          <Edit3 size={16}/>
                        </button>
                        <button 
                          onClick={() => onToggleHidden?.(photo)}
                          className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${photo.isHidden ? 'bg-yellow-100 text-yellow-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                          {photo.isHidden ? <EyeOff size={16}/> : <Eye size={16}/>}
                        </button>
                      </div>
                    )}
                    {!isAdminMode && (
                      <div className="flex items-center gap-2">
                         <button
                          onClick={handleShare}
                          className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${isCopied ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                          title="Copy Direct Link"
                        >
                          {isCopied ? <Check size={16} /> : <Share2 size={16} />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 2. 价格与型号组合 */}
                  {(photo.price || photo.model_number) && (
                    <div className="flex flex-wrap items-stretch gap-3">
                       {photo.price && (
                         <div className="bg-brand-navy text-brand-bg px-4 py-2 rounded-2xl shadow-md flex-1 min-w-[120px]">
                           <span className="text-[10px] font-bold uppercase tracking-widest block opacity-70 mb-0.5">{(t as any).price}</span>
                           <p className="text-xl font-bold leading-none">{photo.price}</p>
                         </div>
                       )}
                       {photo.model_number && (
                         <div className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-2xl flex-1 min-w-[120px] flex flex-col justify-center">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">{(t as any).modelNumber}</span>
                           <p className="font-mono font-bold text-slate-700">{photo.model_number}</p>
                         </div>
                       )}
                    </div>
                  )}

                  {/* 3. 厂商与标签 */}
                  {((mfrName && mfrName !== catName) || displayTags.length > 0) && (
                    <div className="flex flex-wrap items-center gap-2">
                       {(mfrName && mfrName !== catName) && (
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             console.log("Filtering by:", mfrName);
                           }}
                           className="bg-orange-50 text-orange-600 px-2.5 py-1 border border-orange-200 rounded-lg text-xs font-bold flex items-center hover:bg-orange-100 transition-colors"
                         >
                           <Key size={10} className="mr-1.5" />
                           {mfrName}
                         </button>
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
                                                      { (t as any).ungroup || 'Ungroup' }
                         </button>
                         <button 
                           onClick={() => onSetGroupCover?.(photo.id, photo.groupId!)}
                           className={`py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${photo.isGroupCover ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-600 border-blue-100'}`}
                         >
                           { (t as any).setCover || 'Set Cover' }
                         </button>
                    </div>
                  )}

                  {/* 4. 尺寸详情 */}
                  {Array.isArray(photo.dimensions) && photo.dimensions.length > 0 && (
                    <div className="space-y-3">
                       <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] pl-1">{t.dimensions || 'Dimensions'}</h3>
                       <div className="grid grid-cols-2 gap-3">
                         {photo.dimensions.map((dim: Dimension, i: number) => {
                           const label = dim.label || '';
                           const prefixMatch = label.match(/^([A-Z]+):\s*(.*)/);
                           const prefix = prefixMatch ? prefixMatch[1] : '';
                           const dimStr = prefixMatch ? prefixMatch[2] : label;
                           
                           return (
                             <div key={i} className="bg-white p-3.5 border border-slate-100 rounded-[24px] col-span-2 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    {prefix && (
                                      <span className="bg-brand-navy text-white text-[9px] font-black px-2.5 py-0.5 rounded-lg tracking-tighter uppercase whitespace-nowrap mr-2">
                                        {prefix}
                                      </span>
                                    )}
                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
                                      SPEC
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full uppercase tracking-tighter">
                                    {dim.unit || 'cm'}
                                  </span>
                                </div>
                                
                                <p className="font-black text-brand-navy text-base md:text-lg leading-snug tracking-tight">
                                  {dimStr || '-'}
                                </p>
                                
                                {(!/\d/.test(dimStr) && (dim.length || dim.width || dim.height)) && (
                                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
                                    <div>
                                       <span className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">L</span>
                                       <p className="font-bold text-slate-700 text-sm">{dim.length || '-'}</p>
                                    </div>
                                    <div>
                                       <span className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">W</span>
                                       <p className="font-bold text-slate-700 text-sm">{dim.width || '-'}</p>
                                    </div>
                                    <div>
                                       <span className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">H</span>
                                       <p className="font-bold text-slate-700 text-sm">{dim.height || '-'}</p>
                                    </div>
                                  </div>
                                )}
                             </div>
                           );
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
                      {(photo.description_translations?.[activeLang as 'zh'|'en'|'ms'] || (activeLang === 'zh' && photo.description)) ? (
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
                      ) : null}

                      {/* Group Story (Series Story) if exists and photo is in group */}
                      {photo.groupId && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-3 bg-blue-600 rounded-full" />
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.seriesStory || 'Series Context'}</h3>
                          </div>
                          
                          {isGroupDataLoading ? (
                            <div className="bg-white p-4 rounded-xl border-l-[3px] border-blue-500 shadow-md space-y-2">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-5/6" />
                              <Skeleton className="h-4 w-4/6" />
                            </div>
                          ) : groupData && (groupData.description_translations?.[activeLang as 'zh'|'en'|'ms'] || (activeLang === 'zh' && groupData.description)) ? (
                            <div className="bg-white p-4 rounded-xl border-l-[3px] border-blue-500 shadow-md">
                              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap italic opacity-80">
                                {groupData.description_translations?.[activeLang as 'zh'|'en'|'ms'] || (activeLang === 'zh' ? groupData.description : '')}
                              </p>
                            </div>
                          ) : null}
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
          </motion.div>

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
        </motion.div>
      )}

      {/* 顶部悬浮页码/切换已移除 */}
    </motion.div>
  );
};
