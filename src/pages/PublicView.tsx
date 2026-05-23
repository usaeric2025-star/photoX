import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { Skeleton } from '../components/ui/Skeleton';
import { cleanPhotos, filterPhotos, groupPhotos } from '../lib/filters';
import { 
  useCategoriesQuery, useInfinitePhotos, usePhotoCountQuery, useUpdatePhotoMutation, 
  useFeedback, useTagsQuery, useScrollRestoration, useDebouncedSearch,
  useAuth, useSettings, useMultiSelect
} from '@/hooks';
import { useGalleryStore, useShallow } from '@/store';
import { PAGINATION, ROUTES, UI } from '@/config/constants';
import { Photo, Tag } from '@/types';
import { safeArray } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/hooks/queries/keys';
import { DataLoadingContainer } from '@/components/ui/DataLoadingContainer';
import { saveData, syncCache } from '@/utils/indexedDB';
import { PublicGallery } from '@/components/public/PublicGallery';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { loginWithGoogle } from '@/services/supabaseService';

/* Removed ErrorFallback component */

const EMPTY_TAGS: Tag[] = [];

export default function PublicView() {
  // removed render log
  // ========== 1. 所有 Hooks 先调用（按顺序，无条件）==========
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useFeedback();
  const { reset } = useMultiSelect();
  const { user } = useAuth();
  const { settings, isLoading: isSettingsLoading } = useSettings();
  const categoriesQuery = useCategoriesQuery();
  const tagsQuery = useTagsQuery();
  const { mutateAsync: updatePhotoMutation } = useUpdatePhotoMutation();
  
  // Store
  const filterCatId = useGalleryStore(s => s.filterCatId);
  const filterTagIds = useGalleryStore(s => s.filterTagIds);
  const sortOrder = useGalleryStore(s => s.sortOrder);
  const setFilterCatId = useGalleryStore(s => s.setFilterCatId);
  const setFilterTagIds = useGalleryStore(s => s.setFilterTagIds);
  const setStoreSearchQuery = useGalleryStore(s => s.setSearchQuery);
  const searchQuery = useGalleryStore(s => s.searchQuery);
  const setSearchQuery = useGalleryStore(s => s.setSearchQuery);
  const debouncedSearchQuery = useGalleryStore(s => s.debouncedSearchQuery);
  const setDebouncedSearchQuery = useGalleryStore(s => s.setDebouncedSearchQuery);
  
  const { 
    setPhotos, setTotalCount, setIsFetching, setIsFetchingNextPage, 
    setHasNextPage, setLoadMorePhotos 
  } = useGalleryStore(useShallow(s => ({
    setPhotos: s.setPhotos,
    setTotalCount: s.setTotalCount,
    setIsFetching: s.setIsFetching,
    setIsFetchingNextPage: s.setIsFetchingNextPage,
    setHasNextPage: s.setHasNextPage,
    setLoadMorePhotos: s.setLoadMorePhotos
  })));

  const resetFilters = useGalleryStore(s => s.resetFilters);
  
  // 查询
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
    searchQuery: debouncedSearchQuery,
  });
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [showImmediateLoading, setShowImmediateLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowImmediateLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);
  
  // ========== 4. 计算状态 (移至此处) ==========
  const isInitialLoading = isSettingsLoading || !minTimeElapsed;

  // ========== 2. useEffect & Callbacks ==========
  // 滚动恢复
  useScrollRestoration('public_view_scroll');

  // 最小加载时间 (Consolidated)
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, UI.MIN_LOADING_TIME_MS);
    
    return () => {
      clearTimeout(timer);
      reset(); // Multi-select cleanup on unmount
    };
  }, [reset]);
  
  // 缓存预加载
  useEffect(() => {
    (async () => {
      try {
        const [cachedCats, cachedSettings] = await Promise.all([
          syncCache.getCategories(),
          syncCache.getSettings()
        ]);
        
        if (cachedCats && cachedCats.length > 0) {
          queryClient.setQueryData(QUERY_KEYS.categories, cachedCats);
        }
        if (cachedSettings) {
          queryClient.setQueryData(['settings'], cachedSettings);
        }
      } catch (e) {
        console.warn('Failed to load local metadata cache', e);
      }
    })();
  }, [queryClient]);
  
  // ========== 3. useMemo ==========
  const photos = useMemo(() => {
    try {
      const pages = infiniteQuery.data?.pages;
      if (!pages || !Array.isArray(pages)) return [];
      return cleanPhotos(pages.flatMap(p => p?.photos || []));
    } catch (e) {
      console.error('photos 计算失败:', e);
      return [];
    }
  }, [infiniteQuery.data]);

  useEffect(() => {
    setPhotos(photos);
  }, [photos, setPhotos]);

  useEffect(() => {
    setTotalCount(countData || 0);
  }, [countData, setTotalCount]);

  useEffect(() => {
    setIsFetching(infiniteQuery.isLoading || infiniteQuery.isFetching);
    setIsFetchingNextPage(infiniteQuery.isFetchingNextPage);
    setHasNextPage(!!infiniteQuery.hasNextPage);
  }, [
    infiniteQuery.isLoading,
    infiniteQuery.isFetching,
    infiniteQuery.isFetchingNextPage,
    infiniteQuery.hasNextPage,
    setIsFetching,
    setIsFetchingNextPage,
    setHasNextPage
  ]);

  const fetchNextPage = infiniteQuery.fetchNextPage;
  const hasNextPage = infiniteQuery.hasNextPage;
  const isFetchingNextPage = infiniteQuery.isFetchingNextPage;

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    setLoadMorePhotos(handleLoadMore);
  }, [handleLoadMore, setLoadMorePhotos]);
  
  const categoriesData = useMemo(() => {
    return categoriesQuery?.data ?? [];
  }, [categoriesQuery.data]);

  const tagsData = useMemo(() => {
    return tagsQuery?.data ?? [];
  }, [tagsQuery.data]);
  
  // ========== 5. 导航和参数 ==========
  const navigate = useNavigate();
  const { hash, groupId } = useParams<{ hash: string, groupId: string }>();
  
  // ========== 6. 回调函数 ==========
  const handleRefresh = useCallback(async () => {
    try {
      await resetFilters();
      reset();
      sessionStorage.removeItem('photo-filters');
      localStorage.removeItem('photo-filters');
      queryClient.resetQueries({ queryKey: [QUERY_KEYS.photos] });
      queryClient.resetQueries({ queryKey: [QUERY_KEYS.photos, 'infinite'] });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await infiniteQuery.refetch();
      showSuccess('已重置所有筛选');
    } catch (e) {
      showError(e, '刷新产品照片失败');
    }
  }, [resetFilters, reset, queryClient, infiniteQuery, showSuccess, showError]);
  
  // ========== 7. 错误处理/加载状态（条件 return）==========
  if (infiniteQuery.error) {
    return <div className="p-4 text-red-500">加载失败: {(infiniteQuery.error as Error).message}</div>;
  }
  
  // ========== 8. 正常渲染 ==========
  return (
    <div className="flex flex-col fixed inset-0 bg-slate-50 overflow-hidden" id="public-view">
      <DataLoadingContainer
        isLoading={infiniteQuery.isLoading || isSettingsLoading || !settings}
        hasData={!!photos && photos.length > 0}
        showImmediateLoading={showImmediateLoading}
      >
        <ErrorBoundary>
          <PublicGallery 
            photos={photos}
            onExit={() => navigate(ROUTES.ADMIN)}
            onLogin={() => navigate(ROUTES.ADMIN)}
            loginWithGoogle={loginWithGoogle}
            user={user}
            isRefreshing={infiniteQuery.isLoading || infiniteQuery.isFetching}
            onRefresh={handleRefresh}
            onLoadMore={handleLoadMore}
            hasMore={infiniteQuery.hasNextPage}
            isFetchingNextPage={infiniteQuery.isFetchingNextPage}
            totalCount={countData}
            initialHash={hash}
            initialGroupId={groupId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </ErrorBoundary>
      </DataLoadingContainer>
    </div>
  );
}
