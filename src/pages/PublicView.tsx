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
  const { user } = useAuth();
  const { settings, isLoading: isSettingsLoading } = useSettings();
  
  // 滚动恢复
  useScrollRestoration('public_view_scroll');
  
  const navigate = useNavigate();
  const { hash, groupId } = useParams<{ hash: string, groupId: string }>();
  
  // ========== 8. 正常渲染 ==========
  return (
    <div className="flex flex-col fixed inset-0 bg-slate-50 overflow-hidden" id="public-view">
      <DataLoadingContainer
        isLoading={isSettingsLoading || !settings}
        hasData={true} // Data will be handled inside PublicGallery
      >
        <ErrorBoundary>
          <PublicGallery 
            onExit={() => navigate(ROUTES.ADMIN)}
            onLogin={() => navigate(ROUTES.ADMIN)}
            loginWithGoogle={loginWithGoogle}
            user={user}
            initialHash={hash}
            initialGroupId={groupId}
          />
        </ErrorBoundary>
      </DataLoadingContainer>
    </div>
  );
}
