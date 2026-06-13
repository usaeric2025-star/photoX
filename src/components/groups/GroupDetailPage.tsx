import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { ChevronLeft, X, Share2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Photo } from '@/types';
import { TranslationType } from '@/locales';
import { useAdminMode, useGroupDetail, useGroupPhotos, useCategories, useUrlFilters, useCopyToClipboard } from '@/hooks';
import { translations } from '@/locales';
import { getPhotoDisplayName } from '@/services/photo/utils';
import { GroupDetailSkeleton } from './GroupDetailSkeleton';
import { Skeleton } from '../ui/Skeleton';
import { GroupHeader } from './GroupHeader';
import { CollapsibleDescription } from './CollapsibleDescription';
import { GroupGridView } from './GroupGridView';
import { GroupAdminShell } from './GroupAdminShell';
import { GroupInfoPanel } from './GroupInfoPanel';
import { Modal } from '../ui/Modal';

import { useUIStore, useShallow } from '@/store/useUIStore';
import { createTranslate } from '@/locales';
import { LanguageCode } from '@/locales';
import { CopyableId } from '@/components/ui/CopyableId';
import { getSafeText } from '@/services/ai/safeText';

// Add displayPhotos and update for compatibility with PublicGridContainer
export interface GroupDetailPageProps {}

export function GroupDetailPage({}: GroupDetailPageProps) {
  const navigate = useRouterSafe().navigate;
  const { filters, setPhotoId } = useUrlFilters();
  const { copy } = useCopyToClipboard({ successMessage: "合组ID已复制" });
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
    photos: activeGroupPhotos,
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

  const handleClose = () => {
    if (!document.startViewTransition) {
      if (isManagement) {
        navigate({ to: '/admin', search: {}, resetScroll: false });
      } else {
        navigate({ to: '/', search: {}, resetScroll: false });
      }
      return;
    }
    document.startViewTransition(() => {
      if (isManagement) {
        navigate({ to: '/admin', search: {}, resetScroll: false });
      } else {
        navigate({ to: '/', search: {}, resetScroll: false });
      }
    });
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-white overflow-hidden w-full relative">
       {/* Top Header */}
       <GroupHeader 
          displayName={groupDisplayName || (activeGroupPhotos[0] ? getPhotoDisplayName(activeGroupPhotos[0], categories, lang, t) : '') || `GROUP ${activeGroupId.slice(-4)}`}
          activeGroupId={activeGroupId}
          isGroupDataLoading={isGroupDataLoading}
          onClose={handleClose}
          onCopyId={(id) => copy(id)}
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
            groupData={groupData}
            isLoading={isLoading}
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={hasNextPage}
            highlightId={currentHighlightId}
            onPhotoClick={(photo) => setPhotoId(photo.id)} 
            getPhotoProps={(photo) => ({ showCoverBadge: true })}
        />
      </Suspense>
    </div>
    </div>
  );
};

