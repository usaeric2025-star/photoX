import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, X, ChevronDown } from 'lucide-react';
import { Photo, Tag, Category } from '../types';
import { GroupGridView } from './groups/GroupGridView';
import { GroupAdminShell, GroupAdminShellProps } from './groups/GroupAdminShell';

// Add displayPhotos and setLightboxIndex for compatibility with PublicGallery
export interface GroupDetailViewProps extends GroupAdminShellProps {
  displayPhotos?: Photo[];
  setLightboxIndex?: (idx: number) => void;
  onLongPressStart?: (photo: Photo) => void;
  onLongPressEnd?: () => void;
}

export const GroupDetailView: React.FC<GroupDetailViewProps> = (props) => {
  const { activeGroupId, setActiveGroupId, photos, isAdminMode } = props;
  
  const [focusedGroupPhotoId, setFocusedGroupPhotoId] = useState<string | null>(null);

  const activeGroupPhotos = useMemo(() => {
    if (!activeGroupId) return [];
    return photos
      .filter(p => p.groupId === activeGroupId)
      .sort((a, b) => {
        if (a.isGroupCover) return -1;
        if (b.isGroupCover) return 1;
        if (a.groupOrder !== undefined && b.groupOrder !== undefined) {
          return a.groupOrder - b.groupOrder;
        }
        return (a.item_code || '').localeCompare(b.item_code || '');
      });
  }, [activeGroupId, photos]);

  if (!activeGroupId) return null;

  if (isAdminMode) {
    return <GroupAdminShell {...props} activeGroupId={activeGroupId} />;
  }

  return (
    <AnimatePresence>
      {activeGroupId !== null && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="fixed inset-0 z-[200] bg-[#FDFAF6] overflow-y-auto pt-safe flex flex-col"
        >
           {/* Top Header */}
           <div className="sticky top-0 bg-[#FDFAF6]/90 backdrop-blur-md z-[100] px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setActiveGroupId(null)}
                  className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                     <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">
                       {activeGroupPhotos[0]?.name || `GROUP ${activeGroupId.slice(-4)}`}
                     </h2>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{activeGroupPhotos.length} 張照片 / {activeGroupPhotos.length} Photos</p>
                </div>
              </div>
              <button 
                  onClick={() => setActiveGroupId(null)}
                  className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                  <X size={24} />
              </button>
           </div>

           <GroupGridView 
             photos={activeGroupPhotos} 
             onPhotoClick={(photo) => setFocusedGroupPhotoId(photo.id)} 
           />

           {/* Public Lightbox overlay */}
           <AnimatePresence>
             {focusedGroupPhotoId && (() => {
                 const currentIndex = activeGroupPhotos.findIndex(p => p.id === focusedGroupPhotoId);
                 const photo = activeGroupPhotos[currentIndex];
                 if (!photo) return null;

                 const handlePrev = (e: React.MouseEvent) => {
                   e.stopPropagation();
                   const prevIndex = currentIndex > 0 ? currentIndex - 1 : activeGroupPhotos.length - 1;
                   setFocusedGroupPhotoId(activeGroupPhotos[prevIndex].id);
                 };

                 const handleNext = (e: React.MouseEvent) => {
                   e.stopPropagation();
                   const nextIndex = currentIndex < activeGroupPhotos.length - 1 ? currentIndex + 1 : 0;
                   setFocusedGroupPhotoId(activeGroupPhotos[nextIndex].id);
                 };

                 return (
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="fixed inset-0 z-[400] bg-black/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 lg:p-12 overflow-hidden"
                 onClick={() => setFocusedGroupPhotoId(null)}
               >
                 <div className="w-full h-full flex flex-col md:flex-row relative">
                   <button className="absolute top-4 right-4 z-50 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-white/20 transition-colors backdrop-blur-md" onClick={() => setFocusedGroupPhotoId(null)}>
                     <X size={24} />
                   </button>
                   
                   <div className="flex-1 w-full h-[60vh] md:h-full flex flex-col items-center justify-center p-4 relative group">
                     {activeGroupPhotos.length > 1 && (
                       <button onClick={handlePrev} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-black/70">
                         <ChevronLeft size={24} />
                       </button>
                     )}
                     {activeGroupPhotos.length > 1 && (
                       <button onClick={handleNext} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-black/70">
                         <ChevronRight size={24} />
                       </button>
                     )}
                     <img 
                       src={photo.uri || photo.image_url} 
                       className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                       referrerPolicy="no-referrer"
                       onClick={(e) => e.stopPropagation()}
                     />
                     <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full text-white/80 text-xs font-bold font-mono z-20">
                       {currentIndex + 1} / {activeGroupPhotos.length}
                     </div>
                   </div>

                   <div 
                     className="w-full md:w-80 lg:w-96 bg-white md:rounded-3xl p-6 flex flex-col gap-6 h-[40vh] md:h-auto md:max-h-full overflow-y-auto rounded-t-3xl shadow-2xl relative z-10"
                     onClick={(e) => e.stopPropagation()}
                   >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-black text-slate-800 tracking-tight">照片資訊</h3>
                          <button onClick={() => setFocusedGroupPhotoId(null)} className="md:hidden w-8 h-8 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center">
                            <ChevronDown size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">標籤</label>
                          <div className="flex flex-wrap gap-1.5 border-b border-slate-50 pb-4">
                             {photo.tagIds && photo.tagIds.length > 0 ? photo.tagIds.map(tid => (
                               <span key={tid} className="text-xs font-bold bg-[#1D3557]/5 text-[#1D3557] rounded-md px-2 py-1 border border-[#1D3557]/10">
                                  {props.tagMap?.[tid] || tid}
                               </span>
                             )) : <span className="text-sm font-bold text-slate-600">-</span>}
                          </div>
                        </div>

                        <div className="space-y-2 pt-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">型號</label>
                          <div className="flex items-center">
                             <span className="text-sm font-black text-slate-700 tracking-tight">{photo.model_number || '-'}</span>
                          </div>
                        </div>

                        <div className="space-y-2 pt-1 border-t border-slate-50">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">尺寸</label>
                          <div className="flex items-center">
                             <span className="text-sm font-black text-slate-700 tracking-tight flex items-center gap-1">
                                {photo.dimensions?.[0] ? `📐 ${(() => {
                                    let s = photo.dimensions[0].label || '';
                                    if (!/(cm|mm|inch)/i.test(s)) s += ' ' + (photo.dimensions[0].unit || 'cm');
                                    return s;
                                  })()}` : '-'}
                             </span>
                          </div>
                        </div>

                        <div className="space-y-2 pt-1 border-t border-slate-50">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">備註</label>
                          <div className="flex items-start">
                             <span className="text-sm font-bold text-slate-600 flex items-start gap-1">
                               {photo.description ? `📝 ${photo.description}` : '-'}
                             </span>
                          </div>
                        </div>
                      </div>
                   </div>
                 </div>
               </motion.div>
                 );
             })()}
           </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
