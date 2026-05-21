import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCategoriesQuery, useInfinitePhotos, usePhotoCountQuery, useFeedback } from '../hooks';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { useStore } from '../store';
import { PAGINATION, ROUTES } from '../config/constants';
import { safeArray } from '../lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../hooks/queries/keys';
import { useMultiSelect } from '../hooks/useMultiSelect';
import { FullPageLoading } from '../components/FullPageLoading';
import { syncCache } from '../utils/indexedDB';
import { PublicGallery } from '../components/public/PublicGallery';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { loginWithGoogle } from '../services/supabaseService';
import { globalHandleError } from '../utils/errorHandler';
import * as ErrorMonitor from "@sentry/react";

// ========== 调试工具 ==========
const DEBUG = (stage: string, data?: any) => {
  console.log(`🔍 [PublicViewDebug] ${stage}`, data !== undefined ? data : '');
};

// 全局错误捕获
if (typeof window !== 'undefined') {
  const existingHandler = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    console.error('🚨 全局错误捕获:', { message, source, lineno, colno, error });
    ErrorMonitor.captureException(error || message);
    if (existingHandler) existingHandler(message, source, lineno, colno, error);
  };
  
  const existingRejectionHandler = window.onunhandledrejection;
  window.onunhandledrejection = (event) => {
    console.error('🚨 未处理的 Promise 拒绝:', event.reason);
    ErrorMonitor.captureException(event.reason);
    if (existingRejectionHandler) existingRejectionHandler(event);
  };
}

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  DEBUG('ErrorFallback 触发', { message: error.message });
  globalHandleError(error, 'PublicViewDebug ErrorBoundary');
  return (
    <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
      <p className="text-red-500 mb-4">页面出错了: {error.message}</p>
      <button 
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-slate-900 text-white rounded-lg"
      >
        重试
      </button>
    </div>
  );
}

export default function PublicViewDebug() {
  DEBUG('1. 组件开始渲染');

  const queryClient = useQueryClient();
  const { showError, showSuccess } = useFeedback();
  const { reset } = useMultiSelect();

  DEBUG('2. 调用 useAuth');
  const { user } = useAuth();
  DEBUG('2. useAuth 完成', { hasUser: !!user });

  DEBUG('3. 调用 useSettings');
  const { settings, isLoading: isSettingsLoading } = useSettings();
  DEBUG('3. useSettings 完成', { hasSettings: !!settings, isLoading: isSettingsLoading });

  DEBUG('4. 调用 useStore');
  const {
    filterCatId,
    filterTagIds,
    sortOrder,
    setFilterCatId,
    setFilterTagIds,
    setSearchQuery: setStoreSearchQuery,
    hasLoadedOnce,
    setHasLoadedOnce,
    language
  } = useStore();
  DEBUG('4. useStore 完成', { language, hasLoadedOnce });

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [hasInitialLoaded, setHasInitialLoaded] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      DEBUG('防抖搜索更新', { searchQuery });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
      DEBUG('最小加载时间已过');
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleDoubleClick = () => setShowDebugPanel(prev => !prev);
    document.addEventListener('dblclick', handleDoubleClick);
    return () => document.removeEventListener('dblclick', handleDoubleClick);
  }, []);

  DEBUG('5. 调用 useCategoriesQuery');
  const { data: categoriesData = [] } = useCategoriesQuery();
  DEBUG('5. useCategoriesQuery 完成', { count: categoriesData.length });

  DEBUG('6. 调用 useInfinitePhotos');
  const infiniteQuery = useInfinitePhotos({
    category_id: filterCatId,
    tag_id: safeArray(filterTagIds).length > 0 ? filterTagIds[0] : null,
    searchQuery: debouncedSearchQuery,
    sortOrder: sortOrder,
    isAdminMode: false
  }, PAGINATION.DEFAULT_PAGE_SIZE);
  DEBUG('6. useInfinitePhotos 完成', { 
    isLoading: infiniteQuery.isLoading,
    isFetching: infiniteQuery.isFetching,
    dataLength: infiniteQuery.data?.pages?.length || 0,
    error: infiniteQuery.error
  });

  DEBUG('7. 调用 usePhotoCountQuery');
  const { data: countData } = usePhotoCountQuery({
    category_id: filterCatId,
    tag_id: safeArray(filterTagIds).length > 0 ? filterTagIds[0] : null,
    searchQuery: debouncedSearchQuery
  });
  DEBUG('7. usePhotoCountQuery 完成', { count: countData });

  const photos = useMemo(() => {
    const allPhotos = infiniteQuery.data?.pages?.flatMap(p => p.photos) || [];
    DEBUG('8. photos useMemo', { count: allPhotos.length });
    return allPhotos;
  }, [infiniteQuery.data]);

  const isInitialLoading = infiniteQuery.isLoading || isSettingsLoading || !minTimeElapsed;
  DEBUG('9. 加载状态', { 
    isPhotosLoading: infiniteQuery.isLoading,
    isSettingsLoading,
    minTimeElapsed,
    isInitialLoading
  });

  useEffect(() => {
    if (!isInitialLoading && !hasInitialLoaded) {
      DEBUG('10. 首次加载完成');
      setHasInitialLoaded(true);
      setHasLoadedOnce(true);
    }
  }, [isInitialLoading, hasInitialLoaded, setHasLoadedOnce]);

  const navigate = useNavigate();
  const { hash, groupId } = useParams<{ hash: string, groupId: string }>();
  DEBUG('11. 路由参数', { hash, groupId });

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

  useEffect(() => {
    (async () => {
      try {
        const cachedCats = await syncCache.getCategories();
        if (cachedCats && cachedCats.length > 0) {
          queryClient.setQueryData(QUERY_KEYS.categories, cachedCats);
          DEBUG('分类缓存加载', { count: cachedCats.length });
        }
      } catch (e) {
        console.warn('Failed to load local metadata cache', e);
      }
    })();
  }, [queryClient]);

  useEffect(() => {
    return () => {
      reset();
      DEBUG('多选状态重置');
    };
  }, [reset]);

  const handleRefresh = useCallback(async () => {
    DEBUG('刷新操作触发');
    try {
      setStoreSearchQuery('');
      setSearchQuery('');
      setDebouncedSearchQuery('');
      setFilterCatId(null);
      setFilterTagIds([]);
      reset();
      sessionStorage.removeItem('photo-filters');
      localStorage.removeItem('photo-filters');
      queryClient.resetQueries({ queryKey: ['photos'] });
      queryClient.resetQueries({ queryKey: ['photos', 'infinite'] });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await infiniteQuery.refetch();
      showSuccess('已重置所有筛选');
      DEBUG('刷新完成');
    } catch (e) {
      showError(e, '刷新产品照片失败');
      DEBUG('刷新失败', e);
    }
  }, [infiniteQuery.refetch, showError, showSuccess, queryClient, setStoreSearchQuery, setFilterCatId, setFilterTagIds, reset]);

  const handleLoadMore = useCallback(() => {
    DEBUG('加载更多触发', { 
      hasNextPage: infiniteQuery.hasNextPage, 
      isFetchingNextPage: infiniteQuery.isFetchingNextPage 
    });
    if (infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage) {
      infiniteQuery.fetchNextPage();
    }
  }, [infiniteQuery]);

  DEBUG('12. 渲染决策', {
    isInitialLoading,
    hasLoadedOnce,
    willShowLoader: isInitialLoading && !hasLoadedOnce,
    willShowGallery: !(isInitialLoading && !hasLoadedOnce)
  });

  const DebugPanel = () => {
    if (!showDebugPanel) return null;
    return (
      <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs z-[9999] space-y-2 max-w-xs shadow-xl">
        <div className="flex justify-between items-center border-b border-white/20 pb-1 mb-1">
          <span className="font-bold">🔍 调试面板</span>
          <button onClick={() => setShowDebugPanel(false)} className="text-white/60 hover:text-white">✕</button>
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          <span className="text-white/60">settings:</span>
          <span className={settings ? 'text-green-400' : 'text-red-400'}>{settings ? '✅' : '❌'} {isSettingsLoading ? '(加载中)' : ''}</span>
          
          <span className="text-white/60">photos:</span>
          <span>{photos.length} 张</span>
          
          <span className="text-white/60">isLoading:</span>
          <span>{infiniteQuery.isLoading ? '是' : '否'}</span>
          
          <span className="text-white/60">isFetching:</span>
          <span>{infiniteQuery.isFetching ? '是' : '否'}</span>
          
          <span className="text-white/60">hasNextPage:</span>
          <span>{infiniteQuery.hasNextPage ? '是' : '否'}</span>
          
          <span className="text-white/60">language:</span>
          <span>{language || '未设置'}</span>
          
          <span className="text-white/60">user:</span>
          <span className={user ? 'text-green-400' : 'text-yellow-400'}>{user ? '已登录' : '未登录'}</span>
          
          <span className="text-white/60">filterCatId:</span>
          <span className="truncate max-w-[100px]">{filterCatId || '无'}</span>
          
          <span className="text-white/60">error:</span>
          <span className="text-red-400 truncate">{infiniteQuery.error ? String(infiniteQuery.error).slice(0, 40) : '无'}</span>
        </div>
        <div className="pt-2 flex gap-2">
          <button onClick={() => infiniteQuery.refetch()} className="px-2 py-0.5 bg-white/20 rounded hover:bg-white/30">🔄 重试</button>
          <button onClick={() => location.reload()} className="px-2 py-0.5 bg-white/20 rounded hover:bg-white/30">🔁 刷新页面</button>
        </div>
        <div className="text-white/40 text-[10px] pt-1 text-center">双击页面空白处关闭</div>
      </div>
    );
  };

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="flex flex-col fixed inset-0 bg-brand-bg overflow-hidden">
        <AnimatePresence mode="wait">
          {isInitialLoading && !hasLoadedOnce ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <FullPageLoading />
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col h-full"
            >
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
            </motion.div>
          )}
        </AnimatePresence>
        <DebugPanel />
      </div>
    </ErrorBoundary>
  );
}
