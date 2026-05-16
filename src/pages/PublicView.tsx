import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Skeleton } from '../components/ui/Skeleton';
import { cleanPhotos, filterPhotos, groupPhotos } from '../lib/filters';
import { 
  useCategoriesQuery 
} from '../hooks/queries/useCategories';
import { 
  useInfinitePhotosQuery, 
  usePhotoCountQuery 
} from '../hooks/queries/usePhotos';
import { fetchSettings, loginWithGoogle } from '../services/supabaseService';
import { updatePhoto } from '../services/photoMutationService';
import { PublicGallery } from '../components/PublicGallery';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { loadData, saveData } from '../utils/indexedDB';
import { useAuth } from '../hooks/useAuth';
import { useGallery } from '../hooks/useGallery';
import { useErrorHandler } from '../utils/errorHandler';
import { PAGINATION } from '../constants/config';
import { AppSettings } from '../types';
import { safeArray } from '../lib/utils';

export default function PublicView() {
  const { user } = useAuth();
  const { 
    filterCatId,
    filterTagIds,
    debouncedSearchQuery,
    setIsAdminMode,
    setIsMultiSelect,
    setSelectedIds
  } = useGallery();

  const { handleError } = useErrorHandler();

  const { data: categoriesData = [] } = useCategoriesQuery();

  const infiniteQuery = useInfinitePhotosQuery({
    categoryId: filterCatId,
    tagId: safeArray(filterTagIds).length > 0 ? filterTagIds[0] : null,
    searchQuery: debouncedSearchQuery
  }, PAGINATION.PUBLIC_PAGE_SIZE);

  const { data: countData = 0 } = usePhotoCountQuery({
    categoryId: filterCatId,
    tagId: safeArray(filterTagIds).length > 0 ? filterTagIds[0] : null,
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

  const photos = useMemo(() => {
    return paginatedPhotos?.pages.flat() || [];
  }, [paginatedPhotos]);

  useEffect(() => {
    setIsAdminMode(false);
    setIsMultiSelect(false);
    setSelectedIds([]);
  }, [setIsAdminMode, setIsMultiSelect, setSelectedIds]);
  
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const navigate = useNavigate();
  const { hash, groupId } = useParams<{ hash: string, groupId: string }>();

  useEffect(() => {
    fetchSettings().then(s => {
      setSettings(s as AppSettings);
      saveData('product_settings', s);
    }).catch(e => handleError(e, "fetchSettings"));
  }, []);

  const handleRefresh = async () => {
    await refetch();
  };

  const handleLoadMore = () => {
    console.log("handleLoadMore called. hasNextPage:", hasNextPage, "isFetchingNextPage:", isFetchingNextPage);
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    } else if (!hasNextPage) {
      console.log("handleLoadMore: No more pages to load.");
    } else if (isFetchingNextPage) {
      console.log("handleLoadMore: Already fetching next page.");
    }
  };

  return (
    <div className="flex flex-col fixed inset-0 bg-brand-bg overflow-hidden">
      <ErrorBoundary key="publicGallery">
        <PublicGallery 
          photos={photos}
          categories={categoriesData}
          tags={[]} // Tags from context will be used, but interface requires it
          onExit={() => navigate('/admin')}
          onBatchEdit={() => { /* Implement batch edit logic or pass down */ }}
          showExit={false}
          onLogin={() => navigate('/admin')}
          loginWithGoogle={loginWithGoogle}
          user={user}
          internalPassword={settings?.access_passcode || ""}
          settings={settings}
          isRefreshing={isPhotosFetching || isPhotosLoading}
          onRefresh={handleRefresh}
          onLoadMore={handleLoadMore}
          hasMore={hasNextPage}
          totalCount={countData}
          initialHash={hash}
          initialGroupId={groupId}
          onTogglePinned={async (photo: any) => {
            const newStatus = !photo.isPinned;
            
            // Identify affected photos (the photo itself + any other photos in the same group)
            const sPhotos = safeArray(photos);
            const affectedPhotos = photo.groupId 
              ? sPhotos.filter((p: any) => p.groupId === photo.groupId)
              : [photo];
              
            const sAffected = safeArray(affectedPhotos);
            
            try {
              await Promise.all(
                sAffected.map((p: any) => 
                  updatePhoto(p.id, { isPinned: newStatus })
                )
              );
            } catch (e: any) {
              handleError(e, "togglePinned");
            }
          }}
        />
      </ErrorBoundary>
    </div>
  );
}
