import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { Skeleton } from '../components/ui/Skeleton';
import { cleanPhotos, filterPhotos, groupPhotos } from '../lib/filters';
import { useCategoriesQuery, useInfinitePhotos, usePhotoCountQuery, useUpdatePhotoMutation, useFeedback, useTagStats, useTagsQuery } from '../hooks';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { useStore } from '../store';
import { PAGINATION } from '../config/constants';
import { Photo, Tag } from '../types';
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

const EMPTY_TAGS: Tag[] = [];

export default function PublicView() {
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
  const filterCatId = useStore(s => s.filterCatId);
  const filterTagIds = useStore(s => s.filterTagIds);
  const sortOrder = useStore(s => s.sortOrder);
  const setFilterCatId = useStore(s => s.setFilterCatId);
  const setFilterTagIds = useStore(s => s.setFilterTagIds);
  const setStoreSearchQuery = useStore(s => s.setSearchQuery);
  const hasLoadedOnce = useStore(s => s.hasLoadedOnce);
  const setHasLoadedOnce = useStore(s => s.setHasLoadedOnce);
  const searchQuery = useStore(s => s.searchQuery);
  const setSearchQuery = useStore(s => s.setSearchQuery);
  const debouncedSearchQuery = useStore(s => s.debouncedSearchQuery);
  const setDebouncedSearchQuery = useStore(s => s.setDebouncedSearchQuery);
  const hasInitialLoaded = useStore(s => s.hasInitialLoaded);
  const setHasInitialLoaded = useStore(s => s.setHasInitialLoaded);
  
  const resetFiltersAndRefresh = useStore(s => s.resetFiltersAndRefresh);
  
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
  
  // ========== 4. 计算状态 (移至此处) ==========
  const isInitialLoading = isSettingsLoading || !minTimeElapsed;

  const handleMarkLoaded = useCallback(() => {
    setHasInitialLoaded(true);
    setHasLoadedOnce(true);
  }, [setHasInitialLoaded, setHasLoadedOnce]);

  // ========== 2. useEffect ==========
  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== debouncedSearchQuery) {
        setDebouncedSearchQuery(searchQuery);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearchQuery, setDebouncedSearchQuery]);
  
  // 最小加载时间
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);
  
  // 滚动位置保存
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem('scrollPosition', String(window.scrollY));
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  useEffect(() => {
    const savedPosition = sessionStorage.getItem('scrollPosition');
    if (savedPosition) {
      window.scrollTo({ top: parseInt(savedPosition), behavior: 'auto' });
    }
  }, []);
  
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
  
  // 多选重置
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);
  
  // 首次加载完成标记
  useEffect(() => {
    if (!isInitialLoading && !hasInitialLoaded) {
      handleMarkLoaded();
    }
  }, [isInitialLoading, hasInitialLoaded, handleMarkLoaded]);
  
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
  
  const categoriesData = useMemo(() => {
    return categoriesQuery?.data ?? [];
  }, [categoriesQuery.data]);

  const tagsData = useMemo(() => {
    return tagsQuery?.data ?? [];
  }, [tagsQuery.data]);
  
  // Calculate tag stats for hot tags functionality
  useTagStats(photos);
  
  // ========== 5. 导航和参数 ==========
  const navigate = useNavigate();
  const { hash, groupId } = useParams<{ hash: string, groupId: string }>();
  
  // ========== 6. 回调函数 ==========
  const handleRefresh = useCallback(async () => {
    try {
      await resetFiltersAndRefresh();
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
  }, [resetFiltersAndRefresh, reset, queryClient, infiniteQuery, showSuccess, showError]);
  
  const handleLoadMore = useCallback(() => {
    if (infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage) {
      infiniteQuery.fetchNextPage();
    }
  }, [infiniteQuery]);
  
  // ========== 7. 错误处理/加载状态（条件 return）==========
  if (infiniteQuery.error) {
    return <div className="p-4 text-red-500">加载失败: {(infiniteQuery.error as Error).message}</div>;
  }
  
  if (isSettingsLoading || !settings) {
    return <FullPageLoading />;
  }
  
  // ========== 8. 正常渲染 ==========
  return (
    <div className="flex flex-col fixed inset-0 bg-slate-50 overflow-hidden">
      {isInitialLoading && !hasLoadedOnce ? (
        <FullPageLoading />
      ) : (
        <ErrorBoundary FallbackComponent={ErrorFallback} key="publicGallery">
          <PublicGallery 
            photos={photos}
            categories={categoriesData}
            tags={tagsData}
            onExit={() => navigate(ROUTES.ADMIN)}
            onLogin={() => navigate(ROUTES.ADMIN)}
            loginWithGoogle={loginWithGoogle}
            user={user}
            settings={settings}
            isRefreshing={infiniteQuery.isLoading || infiniteQuery.isFetching}
            onRefresh={handleRefresh}
            onLoadMore={handleLoadMore}
            hasMore={infiniteQuery.hasNextPage}
            isFetchingNextPage={infiniteQuery.isFetchingNextPage}
            totalCount={countData}
            initialHash={hash}
            initialGroupId={groupId}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}
