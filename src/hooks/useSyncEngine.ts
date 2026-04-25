import { useState } from 'react';
import { Photo } from '../types';
import { saveData, loadData } from '../utils/indexedDB';
import { 
    fetchSettings, 
    saveSettings, 
    loadCategoriesFromCloud, 
    loadAllPhotosFromCloud, 
    loadPhotosFromCloud,
    savePhotoToCloud,
    deletePhotoFromCloud,
    uploadLogo
} from '../services/supabaseService';

export const useSyncEngine = () => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [viewMode, setViewMode] = useState<'public' | 'private'>('public');
    const [settings, setSettings] = useState<any>(null);
    const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

    const refreshCloudData = async (
        user: any,
        categories: any[],
        tags: any[],
        manufacturers: any[],
        setSettings: (s: any) => void,
        setPublicCategories: (c: any) => void,
        setPublicTags: (t: any) => void,
        setPublicManufacturers: (m: any) => void,
        setDbCategories: (c: any) => void,
        setPublicPhotos: (p: any) => void,
        setCloudCount: (c: number | null) => void,
        force = false
    ) => {
        setIsSyncing(true);
        try {
            const cloudSettings = await fetchSettings();
            if (cloudSettings) {
                setSettings(cloudSettings);
                
                // Sync theme
                if (cloudSettings.background_color) document.documentElement.style.setProperty('--custom-bg', cloudSettings.background_color);
                if (cloudSettings.primary_color) document.documentElement.style.setProperty('--custom-text', cloudSettings.primary_color);
                if (cloudSettings.accent_color) document.documentElement.style.setProperty('--custom-accent', cloudSettings.accent_color);

                if (cloudSettings.categories !== undefined) {
                    setPublicCategories(cloudSettings.categories);
                    saveData('public_categories', cloudSettings.categories);
                }
                
                if (cloudSettings.tags !== undefined) {
                    setPublicTags(cloudSettings.tags);
                    saveData('public_tags', cloudSettings.tags);
                }
                
                if (cloudSettings.manufacturers !== undefined) {
                    setPublicManufacturers(cloudSettings.manufacturers);
                    saveData('public_manufacturers', cloudSettings.manufacturers);
                }
            }

            const cloudDbCats = await loadCategoriesFromCloud();
            if (cloudDbCats) setDbCategories(cloudDbCats);

            const cloudPublicPhotos = await loadAllPhotosFromCloud();
            if (cloudPublicPhotos) {
                setPublicPhotos(cloudPublicPhotos);
                await saveData('public_photos', cloudPublicPhotos);
            }

            if (user) {
                const cloudPhotos = await loadPhotosFromCloud(user.id);
                if (cloudPhotos) setCloudCount(cloudPhotos.length);
            }
            
            setLastSyncTime(Date.now());
            await saveData('last_sync_time', Date.now());
        } catch (err) {
            console.error("Cloud synchronization failed:", err);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, categories: any[], tags: any[], manufacturers: any[], setAlertDialog: (a: any) => void) => {
        if (e.target.files && e.target.files[0]) {
            try {
                const url = await uploadLogo(e.target.files[0]);
                const newSettings = { ...settings, logo_url: url };
                setSettings(newSettings);
                await saveSettings({
                ...newSettings,
                categories,
                tags,
                manufacturers
                });
                setAlertDialog({ title: '上傳成功', message: '品牌 Logo 已更新' });
            } catch (err: any) {
                console.error("Logo upload failed:", err);
                setAlertDialog({ title: '上傳失敗', message: err.message || '請檢查網路連線或儲存空間權限' });
            }
        }
    };

    return { 
        isSyncing, setIsSyncing,
        viewMode, setViewMode,
        settings, setSettings,
        lastSyncTime, setLastSyncTime,
        refreshCloudData,
        handleLogoUpload
    };
};
