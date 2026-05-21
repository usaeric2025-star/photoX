import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { Skeleton } from '../components/ui/Skeleton';
import { cleanPhotos, filterPhotos, groupPhotos } from '../lib/filters';
import { useCategoriesQuery, useInfinitePhotos, usePhotoCountQuery, useUpdatePhotoMutation, useFeedback } from '../hooks';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { useStore } from '../store';
import { PAGINATION } from '../config/constants';
import { Photo } from '../types';
import { safeArray } from '../lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../hooks/queries/keys';
import { useMultiSelect } from '../hooks/useMultiSelect';
import { FullPageLoading } from '../components/FullPageLoading';
import { saveData, syncCache } from '../utils/indexedDB';
import { PublicGallery } from '../components/public/PublicGallery';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { loginWithGoogle } from '../services/supabaseService';
import { ROUTES } from '../config/constants';

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <p className="text-red-500">页面出错了: {error instanceof Error ? error.message : String(error)}</p>
      <button onClick={resetErrorBoundary} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded">重试</button>
    </div>
  );
}

export default function PublicView() {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useFeedback();
  const { reset } = useMultiSelect();

  // Reset multi select on unmount
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  // 保存滚动位置
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem('scrollPosition', String(window.scrollY));
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 恢复滚动位置
  useEffect(() => {
    const savedPosition = sessionStorage.getItem('scrollPosition');
    if (savedPosition) {
      window.scrollTo({ top: parseInt(savedPosition), behavior: 'auto' });
    }
  }, []);

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
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  // Use store for UI state that should persist
  const { 
    filterCatId,
    filterTagIds,
    sortOrder,
    setFilterCatId,
    setFilterTagIds,
    setSearchQuery: setStoreSearchQuery
  } = useStore();
  
  useEffect(() => {
	  const timer = setTimeout(() => {
		  setDebouncedSearchQuery(searchQuery);
	  }, 300);
	  return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: categoriesData = [] } = useCategoriesQuery();
  const { settings, isLoading: isSettingsLoading } = useSettings();
  const { user } = useAuth();
  
  if (isSettingsLoading || !settings) {
    return <FullPageLoading />;
  }
  
  const { hasLoadedOnce, setHasLoadedOnce } = useStore();

  const infiniteQuery = useInfinitePhotos({
    category_id: filterCatId,
    tag_id: safeArray(filterTagIds).length > 0 ? filterTagIds[0] : null,
    searchQuery: debouncedSearchQuery,
    sortOrder: sortOrder,
    isAdminMode: false
  }, PAGINATION.DEFAULT_PAGE_SIZE);

  const { data: countData } = usePhotoCountQuery({
    category_id: filterCatId,
    tag_id: safeArray(filterTagIds).length > 0 ? filterTagIds[0] : null,
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
    const allPhotos = paginatedPhotos?.pages?.flatMap(p => p.photos) || [];
    return cleanPhotos(allPhotos);
  }, [paginatedPhotos]);
  
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
      // 1. 清空临时状态
      setStoreSearchQuery('');
      setSearchQuery('');
      setDebouncedSearchQuery('');
      setFilterCatId(null);
      setFilterTagIds([]);
      reset();
      
      // 2. 清除持久化的筛选
      sessionStorage.removeItem('photo-filters');
      localStorage.removeItem('photo-filters');
      
      // 3. 重置 React Query 缓存
      queryClient.resetQueries({ queryKey: ['photos'] });
      queryClient.resetQueries({ queryKey: ['photos', 'infinite'] });
      
      // 4. 滚动到顶部
      window.scrollTo({ top: 0, behavior: 'smooth' });

      await refetch();
      showSuccess('已重置所有筛选');
    } catch (e) {
      showError(e, '刷新产品照片失败');
    }
  }, [refetch, showError, showSuccess, queryClient]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handlePhotoClick = useCallback((photo: Photo) => {
    // Implement click logic
  }, []);

  return (
    <div className="flex flex-col fixed inset-0 bg-slate-50 overflow-hidden">
        {isInitialLoading && !hasLoadedOnce ? (
          <FullPageLoading />
        ) : (
            <ErrorBoundary FallbackComponent={ErrorFallback} key="publicGallery">
              <PublicGallery 
                photos={photos}
                categories={categoriesData}
                tags={[]} // Pass empty if no tags
                onExit={() => navigate(ROUTES.ADMIN)}
                onLogin={() => navigate(ROUTES.ADMIN)}
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
        )}
    </div>
  );
}
