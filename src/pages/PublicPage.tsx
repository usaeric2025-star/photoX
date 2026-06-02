import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Skeleton } from '../components/ui/Skeleton';
import { cleanPhotos, filterPhotos, groupPhotos } from '../lib/filters';
import { 
  useCategories, usePhotoInfiniteList, usePhotoCount, 
  useTags, useScrollRestoration,
  useMultiSelect, useSyncMutation, useTasks
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
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function PublicPage() {
  // 滚动恢复
  useScrollRestoration('public_view_scroll');
  
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const authError = (search as any).authError;
  
  const { data: count } = usePhotoCount({});
  const { isLoading } = usePhotoInfiniteList({});

  const { tasks } = useTasks();
  const { mutateAsync: syncMut } = useSyncMutation();
  const isSyncing = tasks.some(t => t.status === 'running' && (t.name.includes('同步') || t.name.includes('Sync')));

  const handleRefresh = () => {
    if (isSyncing) return;
    syncMut('pull');
  };

  const virtualGridRef = useRef<any>(null);
  const handleScrollToTop = () => virtualGridRef.current?.scrollTo(0);

  // ========== 8. 正常渲染 ==========
  return (
    <div className="flex flex-col h-full w-full bg-slate-50 overflow-hidden" id="public-view">
      <PublicHeader 
        totalCount={count}
        onRefresh={handleRefresh}
        isRefreshing={isSyncing}
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
            hasData={true} // Data will be handled inside PublicGridContainer
          >
            <ErrorBoundary>
                <PublicGridContainer 
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
