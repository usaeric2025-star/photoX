import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadAllPhotosFromCloud, loadCategoriesFromCloud, fetchSettings, loginWithGoogle } from '../services/supabaseService';
import { PublicGallery } from '../components/PublicGallery';
import { Photo, Category, Tag, SubCategory, DB_Category } from '../types';
import { loadData, saveData } from '../utils/indexedDB';
import { useAuth } from '../hooks/useAuth';

export default function PublicView() {
  const { user, authChecked } = useAuth();
  const [publicPhotos, setPublicPhotos] = useState<Photo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dbCategories, setDbCategories] = useState<DB_Category[]>([]);
  const [publicTags, setPublicTags] = useState<Tag[]>([]);
  const [publicManufacturers, setPublicManufacturers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  const syncWithCloud = async (isBackground = false) => {
    if (!isBackground) setIsInitializing(true);
    else setIsRefreshing(true);
    try {
      const [cloudPhotos, cloudCats, cloudSettings] = await Promise.all([
        loadAllPhotosFromCloud(),
        loadCategoriesFromCloud(),
        fetchSettings()
      ]);

      if (cloudPhotos) {
        setPublicPhotos(cloudPhotos);
      }
      if (cloudCats) {
        setDbCategories(cloudCats);
      }
      if (cloudSettings) {
        setSettings(cloudSettings);
        if (cloudSettings.categories) {
          setCategories(cloudSettings.categories);
        }
        if (cloudSettings.tags) {
          setPublicTags(cloudSettings.tags);
        }
        if (cloudSettings.manufacturers) {
          setPublicManufacturers(cloudSettings.manufacturers);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsInitializing(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    syncWithCloud(false);
  }, []);

  return (
    <div className="flex flex-col fixed inset-0 bg-[#FDFAF6] overflow-hidden">
      {isInitializing && publicPhotos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading Gallery...</p>
        </div>
      ) : (
        <PublicGallery 
          photos={publicPhotos} 
          categories={categories}
          tags={publicTags}
          manufacturers={publicManufacturers}
          dbCategories={dbCategories}
          onExit={() => navigate('/admin')}
          showExit={false}
          onLogin={() => navigate('/admin')}
          loginWithGoogle={loginWithGoogle}
          user={user}
          internalPassword=""
          settings={settings}
          isRefreshing={isRefreshing}
          onRefresh={() => syncWithCloud(true)}
        />
      )}
    </div>
  );
}
