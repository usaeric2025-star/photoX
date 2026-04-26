import React, { useState } from 'react';
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
    const [viewMode, setViewMode] = useState<'public' | 'private'>('private');
    const [settings, setSettings] = useState<any>(null);
    const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

    React.useEffect(() => {
        const initSettings = async () => {
            let s = await loadData('product_settings');
            if (!s) {
                // Migrate from old key if exists
                const oldS = await loadData('public_settings');
                if (oldS) {
                    s = oldS;
                    await saveData('product_settings', oldS);
                }
            }
            if (s && !settings) setSettings(s);
        };
        initSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
        setCategories: (c: any) => void,
        setTags: (t: any) => void,
        setManufacturers: (m: any) => void,
        setPublicPhotos: (p: any) => void,
        setCloudCount: (c: number | null) => void,
        force = false
    ) => {
        setIsSyncing(true);
        console.log("SyncEngine: Refreshing data (Force:", force, ")...");
        try {
            const cloudSettings = await fetchSettings();
            if (cloudSettings) {
                setSettings(cloudSettings);
                await saveData('product_settings', cloudSettings);
                
                // Sync theme
                if (cloudSettings.background_color) document.documentElement.style.setProperty('--custom-bg', cloudSettings.background_color);
                if (cloudSettings.primary_color) document.documentElement.style.setProperty('--custom-text', cloudSettings.primary_color);
                if (cloudSettings.accent_color) document.documentElement.style.setProperty('--custom-accent', cloudSettings.accent_color);

                if (cloudSettings.categories !== undefined) {
                    setPublicCategories(cloudSettings.categories);
                    setCategories(cloudSettings.categories);
                    await saveData('product_categories', cloudSettings.categories);
                }
                
                if (cloudSettings.tags !== undefined) {
                    setPublicTags(cloudSettings.tags);
                    setTags(cloudSettings.tags);
                    await saveData('product_tags', cloudSettings.tags);
                }
                
                if (cloudSettings.manufacturers !== undefined) {
                    setPublicManufacturers(cloudSettings.manufacturers);
                    setManufacturers(cloudSettings.manufacturers);
                    await saveData('product_manufacturers', cloudSettings.manufacturers);
                }
            }

            const cloudDbCats = await loadCategoriesFromCloud();
            if (cloudDbCats && cloudDbCats.length > 0) {
                setDbCategories(cloudDbCats);
                await saveData('db_categories', cloudDbCats);
            }

            const cloudPhotos = user ? await loadPhotosFromCloud(user.id) : await loadAllPhotosFromCloud();
            if (cloudPhotos) {
                setPublicPhotos((prev: any[]) => {
                    const localMap = new Map((prev || []).map(p => [p.id, p]));
                    const merged = cloudPhotos.map(cp => {
                        const local = localMap.get(cp.id);
                        if (local) {
                            return {
                                ...cp,
                                categoryId: local.categoryId || cp.categoryId,
                                subcategoryId: local.subcategoryId || cp.subcategoryId,
                                tagIds: (local.tagIds && local.tagIds.length > 0) ? local.tagIds : cp.tagIds,
                                name: local.name || cp.name,
                                manual_code: local.manual_code || cp.manual_code,
                                description: local.description || cp.description
                            };
                        }
                        return cp;
                    });
                    
                    const cloudIds = new Set(cloudPhotos.map(p => p.id));
                    const localOnly = (prev || []).filter(p => !cloudIds.has(p.id)).map(p => ({ ...p, isAnalyzing: false }));
                    
                    const final = [...merged, ...localOnly];
                    saveData('product_photos', final);
                    return final;
                });
            }

            if (user) {
                const cloudPhotos = await loadPhotosFromCloud(user.id);
                if (cloudPhotos) setCloudCount(cloudPhotos.length);
            } else if (cloudPhotos) {
                // In staff mode/no user, show total public count
                setCloudCount(cloudPhotos.length);
            }
            
            const now = Date.now();
            setLastSyncTime(now);
            await saveData('last_sync_time', now);
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
