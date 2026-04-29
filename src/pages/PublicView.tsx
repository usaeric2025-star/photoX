import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadAllPhotosFromCloud, loadCategoriesFromCloud, loadTagsFromCloud, loadManufacturersFromCloud, fetchSettings, loginWithGoogle } from '../services/supabaseService';
import { PublicGallery } from '../components/PublicGallery';
import { loadData, saveData } from '../utils/indexedDB';
import { useAuth } from '../hooks/useAuth';
import { useGalleryContext } from '../context/GalleryContext';

export default function PublicView() {
  const { user, authChecked } = useAuth();
  const { 
    photos, setPhotos, 
    categories, setCategories, 
    setTags, 
    setManufacturers,
    page, setPage,
    hasMore, setHasMore,
    setVisibleCount,
    filterCatId,
    filterTagIds,
    debouncedSearchQuery
  } = useGalleryContext();
  
  const [settings, setSettings] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchFilteredPhotos = async () => {
    setIsRefreshing(true);
    try {
      const cloudPhotos = await loadAllPhotosFromCloud(undefined, 0, 100, filterCatId, filterTagIds.length > 0 ? filterTagIds[0] : null, debouncedSearchQuery);
      if (cloudPhotos) {
        setPhotos(cloudPhotos);
        setPage(0);
        setHasMore(cloudPhotos.length === 100);
        setVisibleCount(prev => Math.max(prev, cloudPhotos.length + 20));
      }
    } catch (e) {
      console.error("Critical error in fetchFilteredPhotos:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const syncWithCloud = async (isBackground = false) => {
    // 1. 先读本地缓存
    const cachedPhotos = await loadData('cachedPhotos');
    const cachedCats = await loadData('cachedCategories');
    const cachedTags = await loadData('cachedTags');
    const cachedManufacturers = await loadData('cachedManufacturers');
    const cachedSettings = await loadData('cachedSettings');

    if (cachedPhotos && !filterCatId && filterTagIds.length === 0 && !debouncedSearchQuery) {
      setPhotos(cachedPhotos);
      if (!isBackground) setIsInitializing(false);
    }
    if (cachedCats) setCategories(cachedCats);
    if (cachedTags) setTags(cachedTags);
    if (cachedManufacturers) setManufacturers(cachedManufacturers);
    if (cachedSettings) {
      setSettings(cachedSettings);
    }

    if (!isBackground && !cachedPhotos) setIsInitializing(true);
    else setIsRefreshing(true);

    try {
      const [cloudPhotos, cloudCats, cloudTags, cloudManufacturers, cloudSettings] = await Promise.all([
        loadAllPhotosFromCloud(undefined, 0, 100, filterCatId, filterTagIds.length > 0 ? filterTagIds[0] : null, debouncedSearchQuery),
        loadCategoriesFromCloud(),
        loadTagsFromCloud(),
        loadManufacturersFromCloud(),
        fetchSettings()
      ]);

      if (cloudPhotos) {
        setPhotos(cloudPhotos);
        setPage(0);
        setHasMore(cloudPhotos.length === 100);
        setVisibleCount(prev => Math.max(prev, cloudPhotos.length + 20));
        if (!filterCatId && filterTagIds.length === 0 && !debouncedSearchQuery) {
          saveData('cachedPhotos', cloudPhotos);
        }
      }
      
      if (cloudCats) {
        const normalized = cloudCats.map((c: any) => ({
          ...c,
          id: String(c.id),
          name: c.name || c.zh || 'Uncategorized',
          subcategories: c.subcategories || [] 
        }));
        setCategories(normalized);
        saveData('cachedCategories', normalized);
      }

      if (cloudTags) {
        setTags(cloudTags);
        saveData('cachedTags', cloudTags);
      }

      if (cloudManufacturers) {
        setManufacturers(cloudManufacturers);
        saveData('cachedManufacturers', cloudManufacturers);
      }

      if (cloudSettings) {
        setSettings(cloudSettings);
        saveData('cachedSettings', cloudSettings);
      }
    } catch (e) {
      console.error("Critical error in syncWithCloud:", e);
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
      const morePhotos = await loadAllPhotosFromCloud(undefined, nextPage, 100, filterCatId, filterTagIds.length > 0 ? filterTagIds[0] : null, debouncedSearchQuery);
      if (morePhotos && morePhotos.length > 0) {
        setPhotos(prev => [...prev, ...morePhotos]);
        setPage(nextPage);
        setHasMore(morePhotos.length === 100);
        setVisibleCount(prev => prev + morePhotos.length);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error("[ERROR] loadMore failed:", e);
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
      {isInitializing && photos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading Gallery...</p>
        </div>
      ) : (
        <PublicGallery 
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
        />
      )}
    </div>
  );
}
