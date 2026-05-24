import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, X, ChevronDown, Share2 } from 'lucide-react';
import { Photo, Tag, Category, ProductGroup, Manufacturer } from '../types';
import { TranslationType } from '../lib/ui-helpers';
import { sortGroupPhotos } from '../lib/filters';
import { filterPhotosByMode } from '../utils/photoVisibility';
import { PhotoLightbox } from './PhotoLightbox';
import { Skeleton } from './ui/Skeleton';
import { GroupGridView } from './groups/GroupGridView';
import { GroupAdminShell, GroupAdminShellProps } from './groups/GroupAdminShell';
import { mapSupabasePhoto } from '../services/photoService';
import { DB_CONFIG } from '../constants/config';

import { useAdminMode, useFeedback, useGroupDetailQuery, useTasks } from '@/hooks';
import { usePhotoActions } from '@/contexts/PhotoActionsContext';
import { useInfiniteGroupPhotosQuery } from '@/hooks';
import { useGalleryStore, useShallow } from '../store';
import { translations } from '../lib/translations';


// Add displayPhotos and setLightboxIndex for compatibility with PublicGallery
export interface GroupDetailViewProps extends GroupAdminShellProps {
  activeGroupId: string | null;
  setActiveGroupId: (id: string | null) => void;
  displayPhotos?: Photo[];
  setLightboxIndex?: (idx: number) => void;
  onLongPressStart?: (photo: Photo) => void;
  onLongPressEnd?: () => void;
  shareGroup?: (photos: Photo[]) => void;
  initialPhotoId?: string | null;
  isStaffMode?: boolean;
  contactWhatsApp?: (photo: Photo) => void;
}

export const GroupDetailView: React.FC<GroupDetailViewProps> = (props) => {
  const { activeGroupId, setActiveGroupId, shareGroup, initialPhotoId } = props;
  const isAdminMode = useAdminMode() && !!props.isStaffMode;
  const { showError } = useFeedback();

  const lang = useGalleryStore(s => s.appLang);
  const t = translations[lang as keyof typeof translations] || translations.zh;
  
  const { tasks } = useTasks();
  const isAnalyzing = useMemo(() => tasks.some(t => t.status === 'running' && (t.name.includes('识别') || t.name.includes('分析'))), [tasks]);
  
  const { onEditPhoto, onToggleHidden, onAiAnalyze, onCancelAnalyze } = usePhotoActions();
  
  const [focusedGroupPhotoId, setFocusedGroupPhotoId] = useState<string | null>(null);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const virtuosoRef = useRef<{ scrollToIndex: (args: { index: number; align?: string; behavior?: string }) => void } | null>(null);
  const [currentHighlightId, setCurrentHighlightId] = useState<string | null>(null);

  const { data: groupData, isLoading: isGroupDataLoading } = useGroupDetailQuery(activeGroupId);

  // Paginated group photos via React Query Infinite Query
  const {
    data: infinitePhotosData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isGroupPhotosLoading
  } = useInfiniteGroupPhotosQuery(activeGroupId, isAdminMode, 20);

  const isLoading = isGroupPhotosLoading;

  useEffect(() => {
    if (activeGroupId && initialPhotoId) {
       setCurrentHighlightId(initialPhotoId);
       // Clear highlight after 5 seconds
       const timer = setTimeout(() => setCurrentHighlightId(null), 5000);
       return () => clearTimeout(timer);
    } else {
       setCurrentHighlightId(null);
    }
  }, [activeGroupId, initialPhotoId]);

  useEffect(() => {
    if (activeGroupId && containerRef.current) {
      const saved = sessionStorage.getItem(`group_scroll_${activeGroupId}`);
      if (saved) {
        // Small delay to ensure content is rendered
        setTimeout(() => {
          if (containerRef.current) containerRef.current.scrollTop = parseInt(saved, 10);
        }, 50);
      }
    }
  }, [activeGroupId]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (activeGroupId) {
      sessionStorage.setItem(`group_scroll_${activeGroupId}`, e.currentTarget.scrollTop.toString());
    }
  };



  const activeGroupPhotos = useMemo(() => {
    if (!activeGroupId) return [];

    const groupPhotos = infinitePhotosData?.pages.flatMap(page => page.photos) || [];

    const visiblePhotos = filterPhotosByMode(groupPhotos, isAdminMode);

    return sortGroupPhotos(visiblePhotos);
  }, [activeGroupId, infinitePhotosData, isAdminMode]);

  useEffect(() => {
    if (activeGroupId && initialPhotoId) {
      // Auto-scroll to the photo if list is loaded
      if (!isLoading && activeGroupPhotos.length > 0) {
        const index = activeGroupPhotos.findIndex(p => p.id === initialPhotoId);
        if (index !== -1) {
          // VirtuosoGrid scrollTo might need a small delay
          setTimeout(() => {
             virtuosoRef.current?.scrollToIndex({
                index,
                align: 'center',
                behavior: 'smooth'
             });
          }, 300);
        }
      }
    }
  }, [activeGroupId, initialPhotoId, isLoading, activeGroupPhotos]);

  if (!activeGroupId) return null;

  if (isAdminMode) {
    return <GroupAdminShell initialPhotoId={initialPhotoId} {...props} />;
  }

  return (
    <AnimatePresence>
      {activeGroupId !== null && (
        <motion.div 
          key={activeGroupId}
          ref={containerRef}
          onScroll={handleScroll}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] bg-brand-bg overflow-y-auto pt-safe flex flex-col"
        >
           {/* Top Header */}
           <div className="sticky top-0 bg-brand-bg/90 backdrop-blur-md z-[100] px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setActiveGroupId(null)}
                  className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="flex flex-col min-h-[3rem]">
                  <div className="flex items-center gap-2">
                     {isGroupDataLoading && activeGroupPhotos.length === 0 ? (
                       <Skeleton className="h-6 w-32 bg-slate-200" />
                     ) : (
                       <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                         {groupData?.name || activeGroupPhotos[0]?.name || `GROUP ${activeGroupId.slice(-4)}`}
                       </h2>
                     )}
                  </div>
                  {isGroupDataLoading ? (
                    <Skeleton className="h-3 w-24 mt-1 bg-slate-100" />
                  ) : (
                    <p className="text-xs text-slate-500 font-normal">{activeGroupPhotos.length} 張照片 / Photos</p>
                  )}
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
            {(isGroupDataLoading || groupData?.description) && (
              <div className="px-5 py-4 bg-white border-b border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-3 bg-blue-600 rounded-full" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t?.seriesStory || 'Series Story'}</span>
                </div>
                {isGroupDataLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                ) : (
                  <p className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-wrap italic">
                    {groupData?.description}
                  </p>
                )}
              </div>
            )}

           <GroupGridView 
             onEndReached={() => {
               if (hasNextPage && !isFetchingNextPage) {
                 fetchNextPage();
               }
             }}
             virtuosoRef={virtuosoRef}
             photos={activeGroupPhotos} 
             isLoading={isLoading}
             isFetchingNextPage={isFetchingNextPage}
             hasNextPage={hasNextPage}
             highlightId={currentHighlightId}
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
                      contactWhatsApp={props.contactWhatsApp || (() => {})}
                      onEditPhoto={onEditPhoto}
                      onToggleHidden={onToggleHidden}
                      onAiAnalyze={onAiAnalyze as any}
                      onCancelAnalyze={onCancelAnalyze}
                      isAnalyzing={isAnalyzing}
                    />
                 );
             })()}
           </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
