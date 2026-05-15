import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Skeleton } from '../components/ui/Skeleton';
import { cleanPhotos, filterPhotos, groupPhotos } from '../lib/filters';
import { loadAllPhotosFromCloud, loadCategoriesFromCloud, loadTagsFromCloud, loadManufacturersFromCloud, fetchSettings, loginWithGoogle, getPhotoCount } from '../services/supabaseService';
import { updatePhoto } from '../services/photoMutationService';
import { PublicGallery } from '../components/PublicGallery';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { loadData, saveData } from '../utils/indexedDB';
import { useAuth } from '../hooks/useAuth';
import { useGalleryContext } from '../context/GalleryContext';
import { PAGINATION } from '../constants/config';
import { AppSettings } from '../types';
import { safeArray } from '../lib/utils';

export default function PublicView() {
  const { user } = useAuth();
  const { 
    photos, setPhotos, 
    categories, setCategories, 
    setTags, 
    setManufacturers,
    page, setPage,
    hasMore, setHasMore,
    setVisibleCount,
    setTotalCloudCount,
    totalCloudCount,
    filterCatId,
    filterTagIds,
    debouncedSearchQuery,
    setIsAdminMode,
    setIsMultiSelect,
    setSelectedIds
  } = useGalleryContext();

  const handleError = (error: any, context?: string) => {
    console.error(`[PublicView] ${context}:`, error);
  };

  useEffect(() => {
    setIsAdminMode(false);
    setIsMultiSelect(false);
    setSelectedIds([]);
  }, [setIsAdminMode, setIsMultiSelect, setSelectedIds]);
  
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  const { hash, groupId } = useParams<{ hash: string, groupId: string }>();

  const fetchFilteredPhotos = async () => {
    setIsRefreshing(true);
    try {
      const sFilterTagIds = safeArray(filterTagIds);
      const tagId = sFilterTagIds.length > 0 ? sFilterTagIds[0] : null;
      
      // Use a smaller initial fetch for speed (e.g. PAGINATION.PUBLIC_PAGE_SIZE = 100)
      const [cloudPhotos, total] = await Promise.all([
        loadAllPhotosFromCloud(undefined, 0, PAGINATION.PUBLIC_PAGE_SIZE, filterCatId, tagId, debouncedSearchQuery),
        getPhotoCount(filterCatId, tagId, debouncedSearchQuery)
      ]);
      const sCloudPhotos = safeArray(cloudPhotos);
      if (cloudPhotos) {
        const cleaned = cleanPhotos(sCloudPhotos);
        setPhotos(cleaned);
        setPage(0);
        setHasMore(sCloudPhotos.length === PAGINATION.PUBLIC_PAGE_SIZE);
        setVisibleCount(prev => Math.max(prev, sCloudPhotos.length + PAGINATION.PUBLIC_LOAD_MORE_OFFSET));
        setTotalCloudCount(total);
        
        // Sync to cache
        if (!filterCatId && safeArray(filterTagIds).length === 0 && !debouncedSearchQuery) {
          saveData('product_photos', cleaned);
        }
      }
    } catch (e) {
      handleError(e, "fetchFilteredPhotos");
    } finally {
      setIsRefreshing(false);
    }
  };

  const syncWithCloud = async (isBackground = false) => {
    // 1. First, load everything from Local Cache (IndexedDB)
    // This happens instantly, allowing for a fast first render if data exists
    const [cachedPhotos, cachedCats, cachedTags, cachedManufacturers, cachedSettings] = await Promise.all([
      loadData('product_photos'),
      loadData('product_categories'),
      loadData('product_tags'),
      loadData('product_manufacturers'),
      loadData('product_settings')
    ]);

    // Apply cache immediately if available
    const hasCache = !!cachedPhotos || !!cachedCats;
    if (cachedPhotos && !filterCatId && safeArray(filterTagIds).length === 0 && !debouncedSearchQuery) {
      setPhotos(cleanPhotos(cachedPhotos));
    }
    if (cachedCats) setCategories(cachedCats);
    if (cachedTags) setTags(cachedTags);
    if (cachedManufacturers) setManufacturers(cachedManufacturers);
    if (cachedSettings) setSettings(cachedSettings as AppSettings);

    // If we have cache, we can hide the BIG initialization screen and just show a small refresh spinner later
    if (hasCache && !isBackground) {
      setIsInitializing(false);
    }

    // Set refreshing state for the background cloud sync
    if (isBackground || hasCache) {
      setIsRefreshing(true);
    } else {
      setIsInitializing(true);
    }

    try {
      const sFilterTagIds = safeArray(filterTagIds);
      const tagId = sFilterTagIds.length > 0 ? sFilterTagIds[0] : null;
      
      // Parallel fetch all data from Supabase
      const [cloudPhotos, cloudCats, cloudTags, cloudManufacturers, cloudSettings, total] = await Promise.all([
        loadAllPhotosFromCloud(undefined, 0, PAGINATION.PUBLIC_PAGE_SIZE, filterCatId, tagId, debouncedSearchQuery),
        loadCategoriesFromCloud().catch(() => []),
        loadTagsFromCloud().catch(() => []),
        loadManufacturersFromCloud().catch(() => []),
        fetchSettings().catch(() => ({})),
        getPhotoCount(filterCatId, tagId, debouncedSearchQuery).catch(() => 0)
      ]);

      const sCloudPhotos = safeArray(cloudPhotos);
      if (cloudPhotos) {
        const cleanedCloud = cleanPhotos(sCloudPhotos);
        setPhotos(cleanedCloud);
        setPage(0);
        setHasMore(sCloudPhotos.length === PAGINATION.PUBLIC_PAGE_SIZE);
        setVisibleCount(prev => Math.max(prev, sCloudPhotos.length + PAGINATION.PUBLIC_LOAD_MORE_OFFSET));
        setTotalCloudCount(total);
        if (!filterCatId && sFilterTagIds.length === 0 && !debouncedSearchQuery) {
          saveData('product_photos', cleanedCloud);
        }
      }
      
      if (cloudCats) {
        const normalized = safeArray(cloudCats).map((c: any) => ({
          ...c,
          id: String(c.id),
          name: c.name || c.zh || 'Uncategorized',
          subcategories: safeArray(c.subcategories)
        }));
        setCategories(normalized);
        saveData('product_categories', normalized);
      }

      if (cloudTags) {
        setTags(cloudTags);
        saveData('product_tags', cloudTags);
      }

      if (cloudManufacturers) {
        setManufacturers(cloudManufacturers);
        saveData('product_manufacturers', cloudManufacturers);
      }

      if (cloudSettings) {
        setSettings(cloudSettings as AppSettings);
        saveData('product_settings', cloudSettings);
      }
    } catch (e) {
      handleError(e, "syncWithCloud");
    } finally {
      setIsInitializing(false);
      setIsRefreshing(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || isRefreshing) return;
    
    setIsRefreshing(true);
    const nextPage = page + 1;
    
    try {
      const sFilterTagIds = safeArray(filterTagIds);
      const morePhotos = await loadAllPhotosFromCloud(undefined, nextPage, PAGINATION.PUBLIC_PAGE_SIZE, filterCatId, sFilterTagIds.length > 0 ? sFilterTagIds[0] : null, debouncedSearchQuery);
      const sMorePhotos = safeArray(morePhotos);
      if (morePhotos && sMorePhotos.length > 0) {
        setPhotos(prev => [...prev, ...cleanPhotos(sMorePhotos)]);
        setPage(nextPage);
        setHasMore(sMorePhotos.length === PAGINATION.PUBLIC_PAGE_SIZE);
        setVisibleCount(prev => prev + sMorePhotos.length);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      handleError(e, "loadMore");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // When filters change, we should trigger a fresh fetch if it's not the initial mount.
    if (!isInitializing) {
      fetchFilteredPhotos();
    }
  }, [filterCatId, filterTagIds, debouncedSearchQuery]);

  useEffect(() => {
    syncWithCloud(false);
  }, []);

  return (
    <div className="flex flex-col fixed inset-0 bg-[#FDFAF6] overflow-hidden">
      <ErrorBoundary key="publicGallery">
        <PublicGallery 
          photos={photos}
          categories={categories}
          tags={[]} // Tags from context will be used, but interface requires it
          onExit={() => navigate('/admin')}
          onBatchEdit={() => { /* Implement batch edit logic or pass down */ }}
          showExit={false}
          onLogin={() => navigate('/admin')}
          loginWithGoogle={loginWithGoogle}
          user={user}
          internalPassword={settings?.access_passcode || ""}
          settings={settings}
          isRefreshing={isRefreshing || isInitializing}
          onRefresh={() => syncWithCloud(true)}
          onLoadMore={loadMore}
          hasMore={hasMore}
          totalCount={totalCloudCount}
          initialHash={hash}
          initialGroupId={groupId}
          onTogglePinned={async (photo) => {
            const newStatus = !photo.isPinned;
            
            // Identify affected photos (the photo itself + any other photos in the same group)
            const sPhotos = safeArray(photos);
            const affectedPhotos = photo.groupId 
              ? sPhotos.filter(p => p.groupId === photo.groupId)
              : [photo];
              
            const sAffected = safeArray(affectedPhotos);
            // Optimistic update for all affected photos
            setPhotos(prev => prev.map(p => 
              sAffected.some(ap => ap.id === p.id) 
                ? { ...p, isPinned: newStatus } 
                : p
            ));
            
            try {
              await Promise.all(
                sAffected.map(p => 
                  updatePhoto(p.id, { isPinned: newStatus })
                )
              );
            } catch (e: any) {
              handleError(e, "togglePinned");
              // Revert changes
              setPhotos(prev => prev.map(p => 
                sAffected.some(ap => ap.id === p.id) 
                  ? { ...p, isPinned: !newStatus } 
                  : p
              ));
            }
          }}
        />
      </ErrorBoundary>
    </div>
  );
}
