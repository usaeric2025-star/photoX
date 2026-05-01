import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, X, ChevronDown, Share2 } from 'lucide-react';
import { Photo, Tag, Category, ProductGroup } from '../types';
import { PhotoLightbox } from './PhotoLightbox';
import { GroupGridView } from './groups/GroupGridView';
import { GroupAdminShell, GroupAdminShellProps } from './groups/GroupAdminShell';

// Add displayPhotos and setLightboxIndex for compatibility with PublicGallery
export interface GroupDetailViewProps extends GroupAdminShellProps {
  displayPhotos?: Photo[];
  setLightboxIndex?: (idx: number) => void;
  onLongPressStart?: (photo: Photo) => void;
  onLongPressEnd?: () => void;
  shareGroup?: (photos: Photo[]) => void;
}

export const GroupDetailView: React.FC<GroupDetailViewProps> = (props) => {
  const { activeGroupId, setActiveGroupId, photos, isAdminMode, shareGroup } = props;
  
  const [focusedGroupPhotoId, setFocusedGroupPhotoId] = useState<string | null>(null);

  const [groupData, setGroupData] = useState<ProductGroup | null>(null);

  useEffect(() => {
    if (activeGroupId) {
      import('../services/groupService').then(m => {
        m.getGroupById(activeGroupId).then(data => {
          if (data) setGroupData(data);
        });
      });
    }
  }, [activeGroupId]);

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
                     <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                       {activeGroupPhotos[0]?.name || `GROUP ${activeGroupId.slice(-4)}`}
                     </h2>
                  </div>
                  <p className="text-xs text-slate-500 font-normal">{activeGroupPhotos.length} 張照片 / Photos</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {shareGroup && (
                  <button 
                    onClick={() => shareGroup(activeGroupPhotos)}
                    className="w-10 h-10 flex items-center justify-center text-blue-500 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
                  >
                    <Share2 size={24} />
                  </button>
                )}
                <button 
                    onClick={() => setActiveGroupId(null)}
                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                >
                    <X size={24} />
                </button>
              </div>
            </div>
            
            {/* Series Story Section */}
            {(groupData?.description_translations?.[props.lang as 'zh'|'en'|'ms'] || groupData?.description) && (
              <div className="px-5 py-4 bg-white border-b border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-3 bg-blue-600 rounded-full" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{props.t?.seriesStory || 'Series Story'}</span>
                </div>
                <p className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-wrap italic">
                  {groupData?.description_translations?.[props.lang as 'zh'|'en'|'ms'] || groupData?.description}
                </p>
              </div>
            )}

           <GroupGridView 
             photos={activeGroupPhotos} 
             onPhotoClick={(photo) => setFocusedGroupPhotoId(photo.id)} 
           />

           {/* Unified Photo Lightbox */}
           <AnimatePresence>
             {focusedGroupPhotoId && (() => {
                 const currentIndex = activeGroupPhotos.findIndex(p => p.id === focusedGroupPhotoId);
                 const photo = activeGroupPhotos[currentIndex];
                 if (!photo) return null;

                 return (
                    <PhotoLightbox 
                      photo={photo}
                      displayPhotos={activeGroupPhotos}
                      index={currentIndex}
                      onClose={() => setFocusedGroupPhotoId(null)}
                      onPrev={() => {
                        const prev = currentIndex > 0 ? currentIndex - 1 : activeGroupPhotos.length - 1;
                        setFocusedGroupPhotoId(activeGroupPhotos[prev].id);
                      }}
                      onNext={() => {
                        const next = currentIndex < activeGroupPhotos.length - 1 ? currentIndex + 1 : 0;
                        setFocusedGroupPhotoId(activeGroupPhotos[next].id);
                      }}
                      t={props.t}
                      lang={props.lang || 'zh'}
                      categories={props.categories || []}
                      manufacturers={props.manufacturers || []}
                      tagMap={props.tagMap || {}}
                      isAdminMode={isAdminMode}
                      isStaffMode={props.isStaffMode || false}
                      contactWhatsApp={props.contactWhatsApp || (() => {})}
                      onEditPhoto={props.onEditPhoto}
                      onToggleHidden={props.onToggleHidden}
                      onAiAnalyze={props.onAiAnalyze}
                      onCancelAnalyze={props.onCancelAnalyze}
                      isAnalyzing={props.isAnalyzing}
                    />
                 );
             })()}
           </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
