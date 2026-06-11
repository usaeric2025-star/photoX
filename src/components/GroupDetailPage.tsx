import React, { useState, useEffect, useRef, Suspense } from 'react';
import { ChevronLeft, X, Share2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Photo } from '../types';
import { TranslationType } from '../lib/ui-helpers';
import { useAdminMode, useGroupDetail, useGroupPhotos, useCategories, useUrlFilters } from '@/hooks';
import { translations } from '../lib/translations';
import { getPhotoDisplayName } from '../lib/ui-helpers';
import { GroupDetailSkeleton } from './groups/GroupDetailSkeleton';
import { Skeleton } from './ui/Skeleton';
import { GroupHeader } from './groups/GroupHeader';
import { CollapsibleDescription } from './groups/CollapsibleDescription';
import { GroupGridView } from './groups/GroupGridView';
import { GroupAdminShell } from './groups/GroupAdminShell';
import { GroupInfoPanel } from './groups/GroupInfoPanel';
import { useAdminActions } from '@/hooks/admin/useAdminActions';
import { useNavigate } from '@tanstack/react-router';
import { useUIStore, useShallow } from '@/store/useUIStore';
import { createTranslate } from '../lib/i18n';
import { LanguageCode } from '../lib/translations';
import { CopyableId } from '@/components/ui/CopyableId';
import { getSafeText } from '@/lib/ai/safeText';

// Add displayPhotos and update for compatibility with PublicGridContainer
export interface GroupDetailPageProps {}

export function GroupDetailPage({}: GroupDetailPageProps) {
  const navigate = useNavigate();
  const { filters, setPhotoId } = useUrlFilters();
  const activeGroupId = filters.groupId;
  const initialPhotoId = filters.photoId;
  
  const isManagement = window.location.pathname.startsWith('/admin');
  const isAdminMode = useAdminMode() && isManagement;
  const lang = useUIStore((s) => s.appLang);
  const t = translations[lang as keyof typeof translations] || translations.en;
  const { data: categories = [] } = useCategories();
  
  const virtualGridRef = useRef<{ scrollToIndex: (args: { index: number; align?: string; behavior?: string }) => void } | null>(null);
  const [currentHighlightId, setCurrentHighlightId] = useState<string | null>(null);

  const { data: groupData, isLoading: isGroupDataLoading, isPlaceholderData: isGroupDataPlaceholder } = useGroupDetail(activeGroupId);

  const {
    data: infinitePhotosData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isGroupPhotosLoading,
    isPlaceholderData: isGroupPhotosPlaceholder
  } = useGroupPhotos(activeGroupId, isAdminMode);

  const isStale = isGroupDataPlaceholder || isGroupPhotosPlaceholder;
  const isLoading = isGroupPhotosLoading || isGroupDataLoading;

  useEffect(() => {
    if (activeGroupId && initialPhotoId) {
       setCurrentHighlightId(initialPhotoId);
       const timer = setTimeout(() => setCurrentHighlightId(null), 5000);
       return () => clearTimeout(timer);
    } else {
       setCurrentHighlightId(null);
    }
  }, [activeGroupId, initialPhotoId]);

  const totalGroupPhotosCount = (() => {
    if (!infinitePhotosData?.pages || infinitePhotosData.pages.length === 0) return undefined;
    return (infinitePhotosData.pages[0] as { total: number }).total;
  })();

  const activeGroupPhotos = (() => {
    if (!activeGroupId) return [];
    return infinitePhotosData?.pages.flatMap((page: any) => page.photos) || [];
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

  const hasScrolledRef = useRef<{ id: string | null; groupId: string | null }>({ id: null, groupId: null });

  useEffect(() => {
    if (activeGroupId && activeGroupPhotos.length > 0 && !initializedRef.current) {
        initializedRef.current = true;
    }

    if (activeGroupId && initialPhotoId) {
        if (hasScrolledRef.current.id === initialPhotoId && hasScrolledRef.current.groupId === activeGroupId) {
            return;
        }

        const index = activeGroupPhotos.findIndex((p: any) => p.id === initialPhotoId);
        if (index !== -1) {
            hasScrolledRef.current = { id: initialPhotoId, groupId: activeGroupId };
            setTimeout(() => {
                virtualGridRef.current?.scrollToIndex({
                    index,
                    align: 'start',
                    behavior: 'smooth'
                });
            }, 300);
        }
    } else {
        hasScrolledRef.current = { id: null, groupId: null };
    }
  }, [activeGroupId, initialPhotoId, activeGroupPhotos.length]);

  const groupDisplayName = groupData ? getSafeText(groupData.name, lang) : '';

  if (!activeGroupId) return null;

  if (isAdminMode) {
    return <GroupAdminShell />;
  }

  const isOpen = activeGroupId !== null;

  const handleClose = () => {
    navigate({ to: isManagement ? '/admin' : '/', search: (prev: any) => ({ ...prev, groupId: undefined, photoId: undefined }), resetScroll: false });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.1, ease: "easeOut" }}
          className="fixed inset-0 z-overlay bg-white overflow-hidden flex flex-col"
          onClick={(e) => { if (e.target === e.currentTarget) { handleClose(); } }}
        >
                   {/* Top Header */}
                   <GroupHeader 
                      displayName={groupDisplayName || (activeGroupPhotos[0] ? getPhotoDisplayName(activeGroupPhotos[0], categories, lang, t) : '') || `GROUP ${activeGroupId.slice(-4)}`}
                      activeGroupId={activeGroupId}
                      isGroupDataLoading={isGroupDataLoading}
                      onClose={handleClose}
                      appLang={lang}
                   />
                
                {/* [GROUP-STALE-SIGNAL] */}
                <div className={`flex-1 min-h-0 flex flex-col transition-opacity duration-300 overflow-y-auto ${isStale ? "opacity-60" : "opacity-100"}`}>
                  
                  {/* Public Description Rendering */}
                  <GroupInfoPanel groupData={groupData || undefined} lang={lang} />

                  <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>}>
                    <GroupGridView 
                        key={activeGroupId}
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
                        onPhotoClick={(photo) => setPhotoId(photo.id)} 
                        getPhotoProps={(photo) => ({ showCoverBadge: true })}
                    />
                  </Suspense>
                </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

