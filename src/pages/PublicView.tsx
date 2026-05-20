import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { Skeleton } from '../components/ui/Skeleton';
import { cleanPhotos, filterPhotos, groupPhotos } from '../lib/filters';
import { 
  useCategoriesQuery, useInfinitePhotos, usePhotoCountQuery, useUpdatePhotoMutation, useFeedback
} from '../hooks';
import { fetchSettings, loginWithGoogle } from '../services/supabaseService';
import { PublicGallery } from '../components/public/PublicGallery';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <p className="text-red-500">页面出错了: {error instanceof Error ? error.message : String(error)}</p>
      <button onClick={resetErrorBoundary} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded">重试</button>
    </div>
  );
}
import { FullPageLoading } from '../components/FullPageLoading';
import { saveData, syncCache } from '../utils/indexedDB';
import { useAuth } from '../hooks/useAuth';
import { useGalleryStore } from '../store';
import { PAGINATION } from '../constants/config';
import { AppSettings, Photo } from '../types';
import { safeArray } from '../lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../hooks/queries/keys';

export default function PublicView() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showError } = useFeedback();

  // Pre-seed cache from local storage
  useEffect(() => {
    (async () => {
      try {
        const cachedCats = await syncCache.getCategories();
        if (cachedCats && cachedCats.length > 0) {
          queryClient.setQueryData(QUERY_KEYS.categories, cachedCats);
        }
      } catch (e) {
        console.warn('Failed to load local metadata cache', e);
      }
    })();
  }, [queryClient]);
  const { 
    filterCatId,
    filterTagIds,
    debouncedSearchQuery,
    sortOrder,
    setIsMultiSelect,
    setSelectedIds
  } = useGalleryStore();

  const { data: categoriesData = [] } = useCategoriesQuery();

  const infiniteQuery = useInfinitePhotos({
    categoryId: filterCatId,
    tagId: safeArray(filterTagIds).length > 0 ? filterTagIds[0] : null,
    searchQuery: debouncedSearchQuery,
    sortOrder: sortOrder,
    isAdminMode: false
  }, PAGINATION.PUBLIC_PAGE_SIZE);

  const { data: countData } = usePhotoCountQuery({
    categoryId: filterCatId,
    tagId: safeArray(filterTagIds).length > 0 ? filterTagIds[0] : null,
    searchQuery: debouncedSearchQuery
  });

  const {
    data: paginatedPhotos,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isLoading: isPhotosLoading,
    isFetching: isPhotosFetching
  } = infiniteQuery;

  const { mutateAsync: updatePhotoMutation } = useUpdatePhotoMutation();

  const photos = useMemo(() => {
    const allPhotos = paginatedPhotos?.pages.flatMap(p => p.photos) || [];
    return cleanPhotos(allPhotos);
  }, [paginatedPhotos]);

  useEffect(() => {
    setIsMultiSelect(false);
    setSelectedIds([]);
  }, [setIsMultiSelect, setSelectedIds]);
  
  const { settings, hasLoadedOnce, setHasLoadedOnce } = useGalleryStore();
  const navigate = useNavigate();
  const { hash, groupId } = useParams<{ hash: string, groupId: string }>();

  const [hasInitialLoaded, setHasInitialLoaded] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    setMinTimeElapsed(true);
  }, []);

  const isInitialLoading = isPhotosLoading || !settings || !minTimeElapsed;

  useEffect(() => {
    if (!isInitialLoading && !hasInitialLoaded) {
      setHasInitialLoaded(true);
      setHasLoadedOnce(true);
    }
  }, [isInitialLoading, hasInitialLoaded, setHasLoadedOnce]);

  const handleRefresh = useCallback(async () => {
    try {
      await refetch();
    } catch (e) {
      showError(e, '刷新产品照片失败');
    }
  }, [refetch, showError]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handlePhotoClick = useCallback((photo: Photo) => {
    // Implement click logic
  }, []);

  return (
    <div className="flex flex-col fixed inset-0 bg-brand-bg overflow-hidden">
      <AnimatePresence mode="wait">
        {isInitialLoading && !hasLoadedOnce ? (
          <FullPageLoading key="loader" />
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex flex-col h-full"
          >
            <ErrorBoundary FallbackComponent={ErrorFallback} key="publicGallery">
              <PublicGallery 
                photos={photos}
                categories={categoriesData}
                tags={[]} // Pass empty if no tags
                onExit={() => navigate('/admin')}
                onLogin={() => navigate('/admin')}
                loginWithGoogle={loginWithGoogle}
                user={user}
                settings={settings}
                isRefreshing={isPhotosLoading || isPhotosFetching}
                onRefresh={handleRefresh}
                onLoadMore={handleLoadMore}
                hasMore={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                totalCount={countData}
                initialHash={hash}
                initialGroupId={groupId}
              />
            </ErrorBoundary>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
