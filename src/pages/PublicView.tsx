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
  // ========== 1. 所有 Hooks 先调用（按顺序，无条件）==========
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useFeedback();
  const { reset } = useMultiSelect();
  const { user } = useAuth();
  const { settings, isLoading: isSettingsLoading } = useSettings();
  const categoriesQuery = useCategoriesQuery();
  const { mutateAsync: updatePhotoMutation } = useUpdatePhotoMutation();
  
  // Store
  const { 
    filterCatId,
    filterTagIds,
    sortOrder,
    setFilterCatId,
    setFilterTagIds,
    setSearchQuery: setStoreSearchQuery,
    hasLoadedOnce,
    setHasLoadedOnce
  } = useStore();
  
  // 查询
  const infiniteQuery = useInfinitePhotos({
    category_id: filterCatId,
    tag_id: safeArray(filterTagIds).length > 0 ? filterTagIds[0] : null,
    searchQuery: '', // Placeholder, will fix
    sortOrder: sortOrder,
    isAdminMode: false
  }, PAGINATION.DEFAULT_PAGE_SIZE);
  
  const { data: countData } = usePhotoCountQuery({
    category_id: filterCatId,
    tag_id: safeArray(filterTagIds).length > 0 ? filterTagIds[0] : null,
    searchQuery: '',
  });
  
  // 状态
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [hasInitialLoaded, setHasInitialLoaded] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  
  // ========== 4. 计算状态 (移至此处) ==========
  const isInitialLoading = infiniteQuery.isLoading || isSettingsLoading || !minTimeElapsed;

  // ========== 2. useEffect ==========
  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // 最小加载时间
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 500);
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
        const cachedCats = await syncCache.getCategories();
        if (cachedCats && cachedCats.length > 0) {
          queryClient.setQueryData(QUERY_KEYS.categories, cachedCats);
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
      setHasInitialLoaded(true);
      setHasLoadedOnce(true);
    }
  }, [isInitialLoading, hasInitialLoaded, setHasLoadedOnce]);
  
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
  
  // ========== 5. 导航和参数 ==========
  const navigate = useNavigate();
  const { hash, groupId } = useParams<{ hash: string, groupId: string }>();
  
  // ========== 6. 回调函数 ==========
  const handleRefresh = useCallback(async () => {
    try {
      setStoreSearchQuery('');
      setSearchQuery('');
      setDebouncedSearchQuery('');
      setFilterCatId(null);
      setFilterTagIds([]);
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
  }, [infiniteQuery.refetch, showError, showSuccess, queryClient, setStoreSearchQuery, setFilterCatId, setFilterTagIds, reset]);
  
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
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-50 text-slate-800">LOADING...</div>
      ) : (
        <ErrorBoundary FallbackComponent={ErrorFallback} key="publicGallery">
          <PublicGallery 
            photos={photos}
            categories={categoriesData}
            tags={[]}
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
