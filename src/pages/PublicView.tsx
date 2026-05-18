import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Skeleton } from '../components/ui/Skeleton';
import { cleanPhotos, filterPhotos, groupPhotos } from '../lib/filters';
import { 
  useCategoriesQuery, useInfinitePhotosQuery, usePhotoCountQuery, useUpdatePhoto
} from '../hooks';
import { fetchSettings, loginWithGoogle } from '../services/supabaseService';
import { PublicGallery } from '../components/PublicGallery';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { saveData } from '../utils/indexedDB';
import { useAuth } from '../hooks/useAuth';
import { useGalleryStore } from '../store';
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
  } = useGalleryStore();

  const { data: categoriesData = [] } = useCategoriesQuery();

  const infiniteQuery = useInfinitePhotosQuery({
    categoryId: filterCatId,
    tagId: safeArray(filterTagIds).length > 0 ? filterTagIds[0] : null,
    searchQuery: debouncedSearchQuery,
    isAdminMode: false
  }, PAGINATION.PUBLIC_PAGE_SIZE);

  const { data: countData } = usePhotoCountQuery({
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

  const { mutateAsync: updatePhotoMutation } = useUpdatePhoto();

  const photos = useMemo(() => {
    return paginatedPhotos?.pages.flatMap(p => p.photos) || [];
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
    }).catch(e => console.error("fetchSettings", e));
  }, []);

  const handleRefresh = async () => {
    await refetch();
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
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
          isRefreshing={isPhotosLoading}
          onRefresh={handleRefresh}
          onLoadMore={handleLoadMore}
          hasMore={hasNextPage}
          totalCount={countData}
          initialHash={hash}
          initialGroupId={groupId}
          onTogglePinned={async (photo: import('../types').Photo) => {
            const newStatus = !photo.isPinned;
            
            // Identify affected photos (the photo itself + any other photos in the same group)
            const sPhotos = safeArray(photos);
            const affectedPhotos = photo.groupId 
              ? sPhotos.filter(p => p.groupId === photo.groupId)
              : [photo];
              
            const sAffected = safeArray(affectedPhotos);
            
            try {
              await Promise.all(
                sAffected.map(p => 
                  updatePhotoMutation({ id: p.id, updates: { isPinned: newStatus } })
                )
              );
            } catch (e: unknown) {
              console.error("togglePinned", e);
            }
          }}
          onToggleHidden={async (photo: import('../types').Photo) => {
            try {
              await updatePhotoMutation({ id: photo.id, updates: { is_hidden: !photo.is_hidden } });
            } catch (e: unknown) {
              console.error("toggleHidden", e);
            }
          }}
          onSetGroupCover={async (id: string, groupId: string) => {
            const groupPhotos = safeArray(photos).filter(p => p.groupId === groupId);
            try {
              await Promise.all(
                groupPhotos.map(p => 
                  updatePhotoMutation({ id: p.id, updates: { isGroupCover: p.id === id } })
                )
              );
            } catch (e: unknown) {
              console.error("setGroupCover", e);
            }
          }}
        />
      </ErrorBoundary>
    </div>
  );
}
