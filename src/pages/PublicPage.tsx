import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Skeleton } from '../components/ui/Skeleton';
import { cleanPhotos, filterPhotos, groupPhotos } from '../lib/filters';
import { 
  useCategories, usePhotos, usePhotoCount, 
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
import { toast } from 'sonner';
import { GroupDetailPage } from '@/components/GroupDetailPage';
import { useUrlFilters } from '@/hooks/useUrlFilters';

export default function PublicPage() {
  // 滚动恢复
  useScrollRestoration('public_view_scroll');
  
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const authError = (search as any).authError;
  const { filters } = useUrlFilters();
  const groupId = filters.groupId;
  
  const { data: count } = usePhotoCount({});
  const { isLoading } = usePhotos({});

  const { tasks } = useTasks();
  const { mutateAsync: syncMut } = useSyncMutation();
  const isSyncing = tasks.some(t => t.status === 'running' && (t.name.includes('同步') || t.name.includes('Sync')));

  const handleRefresh = async () => {
    if (isSyncing) {
       toast.warning('同步正在进行中...');
       return;
    }
    
    try {
      await syncMut('pull');
      toast.success('同步已完成');
    } catch (e: any) {
      toast.error(`同步失败: ${e.message || '未知错误'}`);
    }
  };

  const virtualGridRef = useRef<any>(null);
  const handleScrollToTop = () => virtualGridRef.current?.scrollTo?.(0);

  useEffect(() => {
    document.title = 'PhotoX | 商品画册';
  }, []);

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
                {groupId && (
                  <GroupDetailPage variant="public-showcase" activeGroupId={groupId} />
                )}
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

import { ErrorFactory } from '../lib/error/ErrorFactory';

function AuthErrorThrower({ message }: { message: string }) {
  throw ErrorFactory.wrap(new Error(message), 'AuthErrorThrower');
}
