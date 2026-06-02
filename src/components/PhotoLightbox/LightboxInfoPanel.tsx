import React from 'react';
import { motion } from 'motion/react';
import { useUIStore, useShallow } from '@/store/useUIStore';
import { MessageCircle, Key, Edit3, Eye, EyeOff, Sparkles, Share2, Check, X } from 'lucide-react';
import { Dimension, Photo, ProductGroup, TranslationType, Category, Manufacturer } from '../../types';
import { getTranslatedCategoryName, getPhotoDisplayName, getManufacturerName } from '../../lib/ui-helpers';
import { useAdminActions } from '@/features/admin/useAdminActions';
import { Skeleton } from '../ui/Skeleton';
import { usePermission, useErrorHandler, useTaskExecutor, useTasks } from '@/hooks';

interface LightboxInfoPanelProps {
  photo: Photo;
  groupData: ProductGroup | null;
  isGroupDataLoading: boolean;
  activeLang: string;
  setActiveLang: (v: string) => void;
  isAdminMode: boolean;
  isCopied: boolean;
  isAnalyzing?: boolean;
  t: TranslationType;
  categories: Category[];
  manufacturers: Manufacturer[];
  tagMap: Record<string, string>;
  handleShare: () => void;
  onAiAnalyze?: (photo: Photo) => void;
  onCancelAnalyze?: () => void;
  onToggleHidden?: (photo: Photo) => void;
  onTogglePinned?: (photo: Photo) => void;
  onUngroup?: (photoId: string) => void;
  onSetGroupCover?: (photoId: string, groupId: string) => void;
  contactWhatsApp?: (photo: Photo) => void;
}

export function LightboxInfoPanel({
  photo, groupData, isGroupDataLoading, activeLang, setActiveLang,
  isAdminMode, isCopied, isAnalyzing, t, categories,
  manufacturers, tagMap, handleShare, onAiAnalyze, onCancelAnalyze,
  onToggleHidden, onTogglePinned, onUngroup, onSetGroupCover, contactWhatsApp
}: LightboxInfoPanelProps) {
  
  const { update } = useUIStore(useShallow(s => ({ update: s.update })));
  const onEditPhoto = (p: Photo) => update({ editPhotoId: p.id });
  const { canEdit } = usePermission();
  const mfrName = getManufacturerName(photo.manufacturer_id || undefined, manufacturers);
  const photoDisplayName = getPhotoDisplayName(photo, categories, activeLang, t);
  
  const { tasks } = useTasks();
  const isRunning = tasks.some(t => t.status === 'running');

  const displayTags = (() => {
    const rawIds = Array.isArray(photo.tag_ids) ? photo.tag_ids : [];
    return rawIds
      .map(tid => tagMap[String(tid)])
      .filter((tagName): tagName is string => !!tagName && tagName.trim() !== '');
  })();

  // Use ref to handle scroll reset without remounting the whole container
  const scrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [photo.id]);

  const { handleError } = useErrorHandler();

  const handleAiAnalyze = async () => {
    try {
      if (onAiAnalyze) {
        await onAiAnalyze(photo);
      }
    } catch (err) {
      handleError(err as Error, t.aiAnalyzeFailed || 'AI Analysis Failed');
    }
  };


  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="w-full md:w-[450px] flex flex-col bg-white overflow-hidden shadow-2xl z-10 relative"
    >
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar p-4 pb-24 md:pb-6 space-y-4"
      >
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 border-l-[3px] border-brand-gold pl-3">
             <h2 className="text-xl md:text-2xl font-black text-brand-navy leading-tight uppercase tracking-tight">
              {photoDisplayName}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${isCopied ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              title={t.copyLink || 'Copy Direct Link'}
            >
              {isCopied ? <Check size={16} /> : <Share2 size={16} />}
            </button>
            {isAdminMode && canEdit && (
              <>
                <button 
                  onClick={handleAiAnalyze}
                  disabled={isRunning}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl border border-blue-100 transition-all disabled:opacity-50 ${isAnalyzing ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' : 'bg-blue-50 text-blue-600'}`}
                >
                  {isAnalyzing ? <X size={16} /> : <Sparkles size={16} />}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); if (onEditPhoto) onEditPhoto(photo); }}
                  className="w-9 h-9 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-xl transition-all"
                >
                  <Edit3 size={16}/>
                </button>
                <button 
                  onClick={() => onToggleHidden?.(photo)}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${photo.is_hidden ? 'bg-yellow-100 text-yellow-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  {photo.is_hidden ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>

              </>
            )}
          </div>
        </div>

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

        {(mfrName || displayTags.length > 0) && (
          <div className="flex flex-wrap items-center gap-2">
             {mfrName && (
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

        {isAdminMode && canEdit && photo.group_id && (
          <div className="grid grid-cols-2 gap-2 mt-2">
               <button 
                 onClick={() => onUngroup?.(photo.id)}
                 className="bg-red-50 text-red-600 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-red-100"
               >
                 {(t as any).ungroup || 'Ungroup'}
               </button>
               <button 
                 onClick={() => onSetGroupCover?.(photo.id, photo.group_id!)}
                 className={`py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${photo.is_group_cover ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-600 border-blue-100'}`}
               >
                 {(t as any).setCover || 'Set Cover'}
               </button>
          </div>
        )}

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
                          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">SPEC</span>
                        </div>
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full uppercase tracking-tighter">
                          {dim.unit || 'cm'}
                        </span>
                      </div>
                      <p className="font-black text-brand-navy text-base md:text-lg leading-snug tracking-tight">{(dimStr && dimStr !== '-') ? dimStr : ''}</p>
                      {(dim.length || dim.width || dim.height) && (
                        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
                          <div>
                             <span className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">L</span>
                             <p className="font-bold text-slate-700 text-sm">{dim.length || ''}</p>
                          </div>
                          <div>
                             <span className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">W</span>
                             <p className="font-bold text-slate-700 text-sm">{dim.width || ''}</p>
                          </div>
                          <div>
                             <span className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">H</span>
                             <p className="font-bold text-slate-700 text-sm">{dim.height || ''}</p>
                          </div>
                        </div>
                      )}
                   </div>
                 );
               })}
             </div>
          </div>
        )}

        {(photo.description || (groupData && (groupData.description || groupData.description_translations))) ? (
          <div className="space-y-4">
             <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                 {['zh', 'en', 'ms'].map(l => (
                   <button
                     key={l}
                     onClick={() => setActiveLang(l)}
                     className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${
                       activeLang === l ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                     }`}
                   >
                     {l === 'zh' ? '中文' : l === 'en' ? 'EN' : 'BM'}
                   </button>
                 ))}
             </div>

             {(photo.description_translations?.[activeLang as keyof NonNullable<Photo['description_translations']>] || (activeLang === 'zh' && photo.description)) && (
               <div className="space-y-1.5">
                 <div className="flex items-center gap-1.5">
                   <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.description || 'Description'}</h3>
                   {photo.description_translations?.[activeLang as keyof NonNullable<Photo['description_translations']>] && (
                     <div className="flex items-center gap-1 bg-purple-50 text-purple-500 px-1.5 py-0.5 rounded uppercase text-[8px] font-black tracking-wider">
                       <Sparkles size={8} /> AI
                     </div>
                   )}
                 </div>
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm min-h-[60px]">
                   <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                     {photo.description_translations?.[activeLang as keyof NonNullable<Photo['description_translations']>] || (activeLang === 'zh' ? photo.description : '')}
                   </p>
                 </div>
               </div>
             )}

             {photo.group_id && (
               <div className="space-y-1.5">
                 <div className="flex items-center gap-2">
                   <div className="w-1.5 h-3 bg-blue-600 rounded-full" />
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.seriesStory || 'Series Context'}</h3>
                 </div>
                 {isGroupDataLoading ? (
                   <div className="bg-white p-4 rounded-xl border-l-[3px] border-blue-500 shadow-md space-y-2">
                     <Skeleton className="h-4 w-full" />
                     <Skeleton className="h-4 w-5/6" />
                   </div>
                 ) : groupData && (groupData.description_translations?.[activeLang as keyof NonNullable<ProductGroup['description_translations']>] || (activeLang === 'zh' && groupData.description)) && (
                   <div className="bg-white p-4 rounded-xl border-l-[3px] border-blue-500 shadow-md">
                     <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap italic opacity-80">
                       {groupData.description_translations?.[activeLang as keyof NonNullable<ProductGroup['description_translations']>] || (activeLang === 'zh' ? groupData.description : '')}
                     </p>
                   </div>
                 )}
               </div>
             )}
          </div>
        ) : null}

        {(isAdminMode) && photo.manual_code && (
          <div className="bg-red-50 border border-red-100 p-3 rounded-xl mt-4">
            <h3 className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">{t.internalRef || 'Internal Reference'}</h3>
            <p className="font-mono font-black text-red-600 tracking-wider uppercase">{photo.manual_code}</p>
          </div>
        )}
      </div>

      {/* [FIELD-LEVEL-FALLBACK] Hide button if contactWhatsApp is missing */}
      {contactWhatsApp && (
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 bg-gradient-to-t from-white via-white to-transparent pointer-events-none sticky bottom-0">
           <button 
             onClick={(e) => {
                e.stopPropagation();
                (window as any)._pendingPhoto = photo;
                if (contactWhatsApp) {
                  contactWhatsApp(photo);
                }
              }}
             className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-3 flex-none rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_8px_30px_rgb(37,211,102,0.3)] pointer-events-auto transition-transform active:scale-[0.98]"
           >
             <MessageCircle size={20} fill="currentColor" />
             {t.whatsAppInquiry}
           </button>
        </div>
      )}
    </motion.div>
  );
}
