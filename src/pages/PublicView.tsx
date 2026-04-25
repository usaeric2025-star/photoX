import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadAllPhotosFromCloud, loadCategoriesFromCloud, fetchSettings } from '../services/supabaseService';
import { PublicGallery } from '../components/PublicGallery';
import { Photo, Category, Tag, SubCategory, DB_Category } from '../types';
import { loadData, saveData } from '../utils/indexedDB';

export default function PublicView() {
  const [publicPhotos, setPublicPhotos] = useState<Photo[]>([]);
  const [dbCategories, setDbCategories] = useState<DB_Category[]>([]);
  const [publicTags, setPublicTags] = useState<Tag[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  const loadLocalData = async () => {
    const [sp, sc, stg, s] = await Promise.all([
      loadData('public_photos'),
      loadData('db_categories'),
      loadData('public_tags'),
      loadData('public_settings')
    ]);
    if (sp && sp.length > 0) setPublicPhotos(sp);
    if (sc && sc.length > 0) setDbCategories(sc);
    if (stg && stg.length > 0) setPublicTags(stg);
    if (s) setSettings(s);
  };

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
        saveData('public_photos', cloudPhotos);
      }
      if (cloudCats) {
        setDbCategories(cloudCats);
        saveData('db_categories', cloudCats);
      }
      if (cloudSettings) {
        setSettings(cloudSettings);
        saveData('public_settings', cloudSettings);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsInitializing(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadLocalData();
      await syncWithCloud(true);
    };
    init();
  }, []);

  return (
    <div className="w-full h-full min-h-screen bg-[#FDFBF7] font-sans select-none flex items-center justify-center relative overflow-hidden">
      <div className="w-full max-w-[420px] h-[85vh] bg-white rounded-[48px] shadow-2xl overflow-hidden flex flex-col relative z-10">
        <div className="flex-1 relative flex flex-col overflow-hidden">
          {isInitializing && publicPhotos.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading Gallery...</p>
            </div>
          ) : (
            <PublicGallery 
              photos={publicPhotos} 
              categories={[]}
              tags={publicTags}
              dbCategories={dbCategories}
              onExit={() => {}}
              showExit={false}
              onLogin={() => navigate('/admin')}
              internalPassword=""
              settings={settings}
              isRefreshing={isRefreshing}
              onRefresh={() => syncWithCloud(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
