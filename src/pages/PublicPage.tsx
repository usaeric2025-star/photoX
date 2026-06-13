import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearch } from '@tanstack/react-router';
import { Skeleton } from '../components/ui/Skeleton';
import { 
  useCategories, usePhotos, usePhotoCount, 
  usePhotoSelection, useSyncMutation, useTasks
} from '@/hooks';
import { useUIStore, useShallow } from '@/store/useUIStore';
import { PAGINATION, ROUTES, UI } from '@/config/constants';
import { Photo, Tag } from '@/types';
import { safeArray } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { DataLoadingContainer } from '@/components/ui/DataLoadingContainer';
import { saveData, syncCache } from '@/lib/db/indexedDB';
import { PublicGridContainer } from '@/components/photo/PublicGridContainer';
import { PublicHeader } from '@/components/layouts/headers/PublicHeader';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { showToast } from '@/lib/ui/toast';
import { useUrlFilters } from '@/hooks';

import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { AlertCircle } from 'lucide-react';

// Error display component
const AuthErrorDisplay = ({ message }: { message: string }) => (
  <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 text-center">
    <div className="max-w-md space-y-6 animate-in fade-in zoom-in duration-500">
      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
        <AlertCircle size={32} />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">身份驗證錯誤</h2>
        <p className="text-slate-500 text-sm leading-relaxed">{message}</p>
      </div>
      <button 
        onClick={() => window.location.href = '/'}
        className="w-full py-4 bg-brand-navy text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-brand-navy/10 active:scale-95 transition-all"
      >
        重新嘗試連接
      </button>
    </div>
  </div>
);

export default function PublicPage() {
  const navigate = useRouterSafe().navigate;
  const search = useSearch({ strict: false });
  const authError = (search as any).authError;
  const { filters } = useUrlFilters();
  const groupId = filters.groupId;
  
  const { data: count } = usePhotoCount({
    category_id: filters.categoryId,
    tag_id: filters.tagId,
    searchQuery: filters.searchQuery,
    isAdminMode: false,
    source: 'server' });

  const { tasks } = useTasks();
  const { mutateAsync: syncMut } = useSyncMutation();
  const isSyncing = tasks.some(t => t.status === 'running' && (t.name.includes('同步') || t.name.includes('Sync')));

  const handleRefresh = async () => {
    if (isSyncing) {
       showToast.warning('同步正在进行中...');
       return;
    }
    
    try {
      await syncMut('pull');
    } catch {
      // Error handled by mutation
    }
  };

  const virtualGridRef = useRef<any>(null);
  const handleScrollToTop = () => virtualGridRef.current?.scrollTo?.(0);

  const appLang = useUIStore((s) => s.appLang);

  useEffect(() => {
    document.title = appLang === 'zh' ? 'PhotoX | 商品画册' : 'PhotoX | Catalog';
  }, [appLang]);

  // ========== 8. 正常渲染 ==========
  return (
    <div className="flex flex-col h-full w-full bg-slate-50 overflow-hidden" id="public-view">
      <PublicHeader 
        totalCount={count}
        onRefresh={handleRefresh}
        isRefreshing={isSyncing}
      />
      {authError ? (
        <AuthErrorDisplay message={authError} />
      ) : (
        <div className="flex-1 min-h-0 relative">
            <DataLoadingContainer
              isLoading={false} // Loading handled internally by GridContainer
              hasData={true}
            >
            <ErrorBoundary>
                <PublicGridContainer 
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

