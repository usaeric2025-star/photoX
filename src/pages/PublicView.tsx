import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Skeleton } from '../components/ui/Skeleton';
import { cleanPhotos, filterPhotos, groupPhotos } from '../lib/filters';
import { 
  useCategoryList, usePhotoInfiniteList, usePhotoCount, 
  useFeedback, useTagList, useScrollRestoration, useDebouncedSearch,
  useMultiSelect
} from '@/hooks';
import { useGalleryStore, useShallow } from '@/store/galleryStore';
import { PAGINATION, ROUTES, UI } from '@/config/constants';
import { Photo, Tag } from '@/types';
import { safeArray } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { DataLoadingContainer } from '@/components/ui/DataLoadingContainer';
import { saveData, syncCache } from '@/lib/db/indexedDB';
import { PublicGallery } from '@/components/photo/PublicGallery';
import { PublicHeader } from '@/components/layouts/PublicHeader';
import { ErrorBoundary } from '@/components/ErrorBoundary';
// import { AdminProvider } from '@/contexts/PhotoActionsContext';

/* Removed ErrorFallback component */

const EMPTY_TAGS: Tag[] = [];

export default function PublicView() {
  // 滚动恢复
  useScrollRestoration('public_view_scroll');
  
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const authError = (search as any).authError;
  
  const { data: count } = usePhotoCount({});

  const { isLoading } = usePhotoInfiniteList({});

  const virtualGridRef = useRef<any>(null);
  const handleScrollToTop = () => virtualGridRef.current?.scrollTo(0);

  // ========== 8. 正常渲染 ==========
  return (
    <div className="flex flex-col h-full w-full bg-slate-50 overflow-hidden" id="public-view">
      <PublicHeader 
        totalCount={count}
      />
      {authError ? (
        <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
          <ErrorBoundary>
            <AuthErrorThrower message={authError} />
          </ErrorBoundary>
        </div>
      ) : (
        <div className="flex-1 min-h-0 relative">
          <DataLoadingContainer
            isLoading={isLoading}
            hasData={true} // Data will be handled inside PublicGallery
          >
            <ErrorBoundary>
                <PublicGallery 
                  variant="public-showcase"
                  onScrollToTop={handleScrollToTop}
                  virtualGridRef={virtualGridRef}
                />
              </ErrorBoundary>
          </DataLoadingContainer>
        </div>
      )}
    </div>
  );
}

function AuthErrorThrower({ message }: { message: string }) {
  throw new Error(message);
  return null;
}
