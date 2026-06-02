import React, { useMemo, useState, useEffect, useRef, Suspense } from 'react';
import { ChevronLeft, X, Share2 } from 'lucide-react';
import { Photo } from '../types';
import { GalleryVariant } from '@/types/variant';
import { TranslationType } from '../lib/ui-helpers';
import { sortGroupPhotos } from '../lib/filters';
import { filterPhotosByMode } from '@/lib/filters/photoVisibility';
import { useAdminMode, useErrorHandler, useGroupDetail, useTasks, usePhotoInfiniteGroupList } from '@/hooks';
import { GroupDetailSkeleton } from './groups/GroupDetailSkeleton';
import { PhotoLightbox } from './PhotoLightbox';
import { Skeleton } from './ui/Skeleton';
import { GroupGridView } from './groups/GroupGridView';
import { GroupAdminShell, GroupAdminShellProps } from './groups/GroupAdminShell';
import { useAdminActions } from '@/features/admin/useAdminActions';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { useUIStore, useShallow } from '@/store/useUIStore';
import { createTranslate } from '../lib/i18n';
import { Spinner } from './ui/Spinner';
import { Activity } from 'react';


// Add displayPhotos and update for compatibility with PublicGridContainer
export interface GroupDetailPageProps extends GroupAdminShellProps {
  activeGroupId: string | null;
  onClose?: () => void;
  displayPhotos?: Photo[];
  onLongPressStart?: (photo: Photo) => void;
  onLongPressEnd?: () => void;
  shareGroup?: (photos: Photo[]) => void;
  initialPhotoId?: string | null;
  contactWhatsApp?: (photo: Photo) => void;
  variant?: GalleryVariant;
}

export function GroupDetailPage(props: GroupDetailPageProps) {
  const { activeGroupId, shareGroup, initialPhotoId, variant } = props;
  const isManagement = props.variant === 'full-management' || props.variant === 'staff-workspace';
  const isAdminMode = useAdminMode() && isManagement;
  const { handleError } = useErrorHandler();

  const { setGroupId, setPhotoId } = useUrlFilters();
  const { lang } = useUIStore(useShallow(s => ({ lang: s.appLang })));
  const translate = createTranslate(lang as any);
  
  const { tasks } = useTasks();
  const isAnalyzing = tasks.some(task => task.status === 'running' && (task.name.includes('识别') || task.name.includes('分析')));
  
  const adminActions = useAdminActions();
  const onEditPhoto = (p: Photo | string) => {};
  const onToggleHidden = async (p: Photo) => { await adminActions.updatePhoto(p.id, { is_hidden: !p.is_hidden }); };
  const onAiAnalyze = async (p: Photo) => {};
  const onCancelAnalyze = () => {};
  
  const [focusedGroupPhotoId, setFocusedGroupPhotoId] = useState<string | null>(null);

  const virtualGridRef = useRef<{ scrollToIndex: (args: { index: number; align?: string; behavior?: string }) => void } | null>(null);
  const [currentHighlightId, setCurrentHighlightId] = useState<string | null>(null);

  const { data: groupData, isLoading: isGroupDataLoading, isPlaceholderData: isGroupDataPlaceholder } = useGroupDetail(activeGroupId);

  // Paginated group photos via React Query Infinite Query
  const {
    data: infinitePhotosData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isGroupPhotosLoading,
    isPlaceholderData: isGroupPhotosPlaceholder
  } = usePhotoInfiniteGroupList(activeGroupId, isAdminMode, 20);

  // [GROUP-STALE-SIGNAL]
  const isStale = isGroupDataPlaceholder || isGroupPhotosPlaceholder;

  const isLoading = isGroupPhotosLoading || isGroupDataLoading;

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

  const totalGroupPhotosCount = (() => {
    if (!infinitePhotosData?.pages || infinitePhotosData.pages.length === 0) return undefined;
    return (infinitePhotosData.pages[0] as any).total;
  })();

  const activeGroupPhotos = (() => {
    if (!activeGroupId) return [];

    const groupPhotos = infinitePhotosData?.pages.flatMap(page => page.photos) || [];

    const visiblePhotos = filterPhotosByMode(groupPhotos, isAdminMode);

    return sortGroupPhotos(visiblePhotos);
  })();

  const initializedRef = useRef(false);
  useEffect(() => {
     initializedRef.current = false;
  }, [activeGroupId]);

  useEffect(() => {
    if (activeGroupId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeGroupId]);

  useEffect(() => {
    if (activeGroupId && activeGroupPhotos.length > 0 && !initializedRef.current) {
        initializedRef.current = true;
        if (initialPhotoId) {
            // Auto-scroll to the photo if list is loaded
            const index = activeGroupPhotos.findIndex(p => p.id === initialPhotoId);
            if (index !== -1) {
                setTimeout(() => {
                    virtualGridRef.current?.scrollToIndex({
                        index,
                        align: 'start',
                        behavior: 'smooth'
                    });
                }, 300);
            }
        }
    }
  }, [activeGroupId, initialPhotoId, activeGroupPhotos]);

  if (!activeGroupId) return null;

  if (isAdminMode) {
    // Explicitly destructure to avoid passing internal React Router/Base UI props like asChild down to child components
    const { 
      activeGroupId: _ag, 
      update: _sag, 
      shareGroup: _sg, 
      initialPhotoId: _ipi, 
      variant: _v, 
      // Filter out asChild if it somehow exists in props
      ...restProps 
    } = props as any;

    return <GroupAdminShell initialPhotoId={initialPhotoId} {...restProps} />;
  }

  const isOpen = activeGroupId !== null;

  return (
    <Activity mode={isOpen ? 'visible' : 'hidden'}>
        <div className="fixed inset-0 z-[200] bg-brand-bg overflow-hidden pt-safe flex flex-col">
          {isLoading && !infinitePhotosData ? (
            <GroupDetailSkeleton />
          ) : (
            <>
               {/* Top Header */}
               <div className="flex-shrink-0 sticky top-0 bg-brand-bg/90 backdrop-blur-md z-[100] px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setGroupId(null); setPhotoId(null); }}
                      className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <div className={`flex flex-col min-h-[3rem] ${isStale ? "animate-pulse" : ""}`}>
                      <div className="flex items-center gap-2 min-h-[1.75rem]">
                         {isGroupDataLoading ? (
                           <Skeleton className="h-6 w-32 bg-slate-200" />
                         ) : (
                           <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                             {groupData?.name || activeGroupPhotos[0]?.name || `GROUP ${activeGroupId.slice(-4)}`}
                           </h2>
                         )}
                      </div>
                      <div className="min-h-[1rem]">
                        {isGroupPhotosLoading ? (
                          <Skeleton className="h-3 w-24 mt-1 bg-slate-100" />
                        ) : (
                          <p className="text-xs text-slate-500 font-normal">
                            {(totalGroupPhotosCount ?? activeGroupPhotos.length) || groupData?.member_count || 0} 張照片 / Photos
                          </p>
                        )}
                      </div>
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
                        onClick={(e) => { e.stopPropagation(); setGroupId(null); setPhotoId(null); }}
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
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{translate('seriesStory') || 'Series Story'}</span>
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

                {/* [GROUP-STALE-SIGNAL] */}
                <div className={`flex-1 min-h-0 flex flex-col transition-opacity duration-300 ${isStale ? "opacity-60" : "opacity-100"}`}>
                  <Suspense fallback={<Spinner />}>
                    <GroupGridView 
                        key={activeGroupId}
                        variant={variant}
                        onEndReached={() => {
                        if (hasNextPage && !isFetchingNextPage) {
                            fetchNextPage();
                        }
                        }}
                        virtualGridRef={virtualGridRef}
                        photos={activeGroupPhotos} 
                        isLoading={isLoading}
                        isFetchingNextPage={isFetchingNextPage}
                        hasNextPage={hasNextPage}
                        highlightId={currentHighlightId}
                        onPhotoClick={(photo) => setFocusedGroupPhotoId(photo.id)} 
                    />
                  </Suspense>
                </div>
            </>
          )}

           {/* Unified Photo Lightbox */}
           {focusedGroupPhotoId && (() => {
                 const currentIndex = activeGroupPhotos.findIndex(p => p.id === focusedGroupPhotoId);
                 const photo = activeGroupPhotos[currentIndex];
                 if (!photo) return null;

                 return (
                    <PhotoLightbox 
                      photoId={focusedGroupPhotoId}
                      displayPhotos={activeGroupPhotos}
                      onClose={() => setFocusedGroupPhotoId(null)}
                      onPhotoIdChange={setFocusedGroupPhotoId}
                      contactWhatsApp={props.contactWhatsApp || (() => {})}
                      onEditPhoto={onEditPhoto}
                      onToggleHidden={onToggleHidden}
                      onAiAnalyze={onAiAnalyze as any}
                      onCancelAnalyze={onCancelAnalyze}
                      isAnalyzing={isAnalyzing}
                      variant={props.variant}
                    />
                 );
             })()}
        </div>
    </Activity>
  );
};

