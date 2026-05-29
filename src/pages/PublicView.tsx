import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Skeleton } from '../components/ui/Skeleton';
import { cleanPhotos, filterPhotos, groupPhotos } from '../lib/filters';
import { 
  useCategoriesQuery, useInfinitePhotos, usePhotoCount, 
  useFeedback, useTagsQuery, useScrollRestoration, useDebouncedSearch,
  useAuth, useSettings, useMultiSelect
} from '@/hooks';
import { useGalleryStore, useShallow } from '@/store';
import { PAGINATION, ROUTES, UI } from '@/config/constants';
import { Photo, Tag } from '@/types';
import { safeArray } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { DataLoadingContainer } from '@/components/ui/DataLoadingContainer';
import { saveData, syncCache } from '@/utils/indexedDB';
import { UnifiedHeader } from '@/components/shared/UnifiedHeader';
import { UnifiedGallery } from '@/components/shared/UnifiedGallery';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { loginWithGoogle } from '@/services/authService';
// import { AdminProvider } from '@/contexts/PhotoActionsContext';

/* Removed ErrorFallback component */

const EMPTY_TAGS: Tag[] = [];

export default function PublicView() {
  const { user } = useAuth();
  const { settings, isLoading: isSettingsLoading } = useSettings();
  
  // 滚动恢复
  useScrollRestoration('public_view_scroll');
  
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const authError = (search as any).authError;
  
  const { data: count } = usePhotoCount({});

  // ========== 8. 正常渲染 ==========
  return (
    <div className="flex flex-col fixed inset-0 bg-slate-50 overflow-hidden" id="public-view">
      <UnifiedHeader 
        variant="public-showcase"
        totalCount={count}
        onRefresh={() => window.location.reload()}
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
            isLoading={isSettingsLoading || !settings}
            hasData={true} // Data will be handled inside UnifiedGallery
          >
            <ErrorBoundary>
                <UnifiedGallery 
                  variant="public-showcase"
                  onExit={() => navigate({ to: ROUTES.ADMIN })}
                  onLogin={() => navigate({ to: ROUTES.ADMIN })}
                  loginWithGoogle={loginWithGoogle}
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
