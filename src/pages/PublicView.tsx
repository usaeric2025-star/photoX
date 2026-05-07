import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

const PUBLIC_PAGE_SIZE = 50;

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

  const fetchFilteredPhotos = async () => {
    setIsRefreshing(true);
    try {
      const sFilterTagIds = safeArray(filterTagIds);
      const tagId = sFilterTagIds.length > 0 ? sFilterTagIds[0] : null;
      const [cloudPhotos, total] = await Promise.all([
        loadAllPhotosFromCloud(undefined, 0, 1000, filterCatId, tagId, debouncedSearchQuery),
        getPhotoCount(filterCatId, tagId, debouncedSearchQuery)
      ]);
      const sCloudPhotos = safeArray(cloudPhotos);
      if (cloudPhotos) {
        setPhotos(sCloudPhotos);
        setPage(0);
        setHasMore(sCloudPhotos.length === 1000);
        setVisibleCount(prev => Math.max(prev, sCloudPhotos.length + PAGINATION.PUBLIC_LOAD_MORE_OFFSET));
        setTotalCloudCount(total);
      }
    } catch (e) {
      handleError(e, "fetchFilteredPhotos");
    } finally {
      setIsRefreshing(false);
    }
  };

  const syncWithCloud = async (isBackground = false) => {
    // 1. 先读本地缓存
    const cachedPhotos = await loadData('product_photos');
    const cachedCats = await loadData('product_categories');
    const cachedTags = await loadData('product_tags');
    const cachedManufacturers = await loadData('product_manufacturers');
    const cachedSettings = await loadData('product_settings');

    if (cachedPhotos && !filterCatId && safeArray(filterTagIds).length === 0 && !debouncedSearchQuery) {
      setPhotos(cachedPhotos);
      if (!isBackground) setIsInitializing(false);
    }
    if (cachedCats) setCategories(cachedCats);
    if (cachedTags) setTags(cachedTags);
    if (cachedManufacturers) setManufacturers(cachedManufacturers);
    if (cachedSettings) {
      setSettings(cachedSettings as AppSettings);
    }

    if (!isBackground && !cachedPhotos) setIsInitializing(true);
    else setIsRefreshing(true);

    try {
      const sFilterTagIds = safeArray(filterTagIds);
      const tagId = sFilterTagIds.length > 0 ? sFilterTagIds[0] : null;
      
      const [cloudPhotos, cloudCats, cloudTags, cloudManufacturers, cloudSettings, total] = await Promise.all([
        loadAllPhotosFromCloud(undefined, 0, PUBLIC_PAGE_SIZE, filterCatId, tagId, debouncedSearchQuery),
        loadCategoriesFromCloud().catch(() => []),
        loadTagsFromCloud().catch(() => []),
        loadManufacturersFromCloud().catch(() => []),
        fetchSettings().catch(() => ({})),
        getPhotoCount(filterCatId, tagId, debouncedSearchQuery).catch(() => 0)
      ]);

      const sCloudPhotos = safeArray(cloudPhotos);
      if (cloudPhotos) {
        setPhotos(sCloudPhotos);
        setPage(0);
        setHasMore(sCloudPhotos.length === PUBLIC_PAGE_SIZE);
        setVisibleCount(prev => Math.max(prev, sCloudPhotos.length + PAGINATION.PUBLIC_LOAD_MORE_OFFSET));
        setTotalCloudCount(total);
        if (!filterCatId && sFilterTagIds.length === 0 && !debouncedSearchQuery) {
          saveData('product_photos', sCloudPhotos);
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
      const morePhotos = await loadAllPhotosFromCloud(undefined, nextPage, PUBLIC_PAGE_SIZE, filterCatId, sFilterTagIds.length > 0 ? sFilterTagIds[0] : null, debouncedSearchQuery);
      const sMorePhotos = safeArray(morePhotos);
      if (morePhotos && sMorePhotos.length > 0) {
        setPhotos(prev => [...prev, ...sMorePhotos]);
        setPage(nextPage);
        setHasMore(sMorePhotos.length === PUBLIC_PAGE_SIZE);
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
      {isInitializing && safeArray(photos).length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading Gallery...</p>
        </div>
      ) : (
        <ErrorBoundary key="publicGallery">
          <button
            className="fixed bottom-4 left-4 z-[9999] opacity-10 hover:opacity-100 text-xs bg-slate-800 text-white px-2 py-1 rounded"
            onClick={() => {
              sessionStorage.setItem('isStaffMode', 'true');
              navigate('/admin');
            }}
          >
            Staff Admin
          </button>
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
            internalPassword=""
            settings={settings}
            isRefreshing={isRefreshing}
            onRefresh={() => syncWithCloud(true)}
            onLoadMore={loadMore}
            hasMore={hasMore}
            totalCount={totalCloudCount}
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
      )}
    </div>
  );
}
