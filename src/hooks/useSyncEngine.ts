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
    uploadLogo,
    loadTagsFromCloud
} from '../services/supabaseService';

export const useSyncEngine = () => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [viewMode, setViewMode] = useState<'public' | 'private'>('private');
    const [settings, setSettings] = useState<any>(null);
    const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

    React.useEffect(() => {
        const initSettings = async () => {
            // Cleanup legacy localStorage data if requested to solve UUID issues once and for all
            const hasCleaned = await loadData('uuid_v2_cleanup_done');
            if (!hasCleaned) {
                console.log("SyncEngine: Performing one-time cleanup of legacy local data...");
                const keysToClear = ['product_categories', 'db_categories', 'product_tags', 'temp_tags'];
                for (const key of keysToClear) {
                    // indexedDB saveData is our loadData wrapper
                    await saveData(key, null);
                }
                await saveData('uuid_v2_cleanup_done', true);
            }

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
            const lastSync = await loadData('last_sync_time');
            if (lastSync) setLastSyncTime(lastSync);
        };
        initSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const refreshCloudData = async (
        user: any,
        categories: any[],
        tags: any[],
        manufacturers: any[],
        setSettings?: (s: any) => void,
        setPublicCategories?: (c: any) => void,
        setPublicTags?: (t: any) => void,
        setPublicManufacturers?: (m: any) => void,
        setCategories?: (c: any) => void,
        setTags?: (t: any) => void,
        setManufacturers?: (m: any) => void,
        setPublicPhotos?: (p: any) => void,
        setCloudCount?: (c: number | null) => void,
        force = false
    ) => {
        setIsSyncing(true);
        console.log("SyncEngine: Refreshing data (Force:", force, ")...");
        try {
            const cloudSettings = await fetchSettings();
            if (cloudSettings) {
                setSettings?.(cloudSettings);
                await saveData('product_settings', cloudSettings);
                
                // Sync theme
                if (cloudSettings.background_color) document.documentElement.style.setProperty('--custom-bg', cloudSettings.background_color);
                if (cloudSettings.primary_color) document.documentElement.style.setProperty('--custom-text', cloudSettings.primary_color);
                if (cloudSettings.accent_color) document.documentElement.style.setProperty('--custom-accent', cloudSettings.accent_color);

                if (cloudSettings.manufacturers !== undefined) {
                    setManufacturers?.((prev: any[]) => {
                        const localMap = new Map((prev || []).map(m => [m.id, m]));
                        cloudSettings.manufacturers.forEach((m: any) => localMap.set(m.id, m));
                        const merged = Array.from(localMap.values());
                        setPublicManufacturers?.(merged);
                        saveData('product_manufacturers', merged);
                        return merged;
                    });
                }
            }

            // --- Load Tags Relational ---
            const cloudTags = await loadTagsFromCloud();
            if (cloudTags && cloudTags.length > 0) {
              setTags?.(cloudTags);
              setPublicTags?.(cloudTags);
              await saveData('product_tags', cloudTags);
            } else if (cloudSettings?.tags) {
              // Migration fallback
              setTags?.(cloudSettings.tags);
              setPublicTags?.(cloudSettings.tags);
              await saveData('product_tags', cloudSettings.tags);
            }

            const cloudCategories = await loadCategoriesFromCloud();
            if (cloudCategories && cloudCategories.length > 0) {
                // Categories from cloud already follow the Category interface
                const normalized = cloudCategories.map(c => ({
                  ...c,
                  id: String(c.id),
                  name: c.name || c.zh || 'Uncategorized',
                  subcategories: c.subcategories || [] 
                }));
                
                setCategories?.(normalized);
                setPublicCategories?.(normalized);
                await saveData('product_categories', normalized);
            }

            const cloudPhotos = user ? await loadPhotosFromCloud(user.id) : await loadAllPhotosFromCloud();
            if (cloudPhotos) {
                setPublicPhotos?.((prev: any[]) => {
                    const localMap = new Map((prev || []).filter(p => p && p.id).map(p => [p.id, p]));
                    
                    cloudPhotos.forEach(cp => {
                        const local = localMap.get(cp.id);
                        if (local) {
                            localMap.set(cp.id, {
                                ...local,
                                ...cp,
                                // Favor cloud values for relational IDs as source of truth
                                categoryId: cp.categoryId || local.categoryId,
                                subcategoryId: cp.subcategoryId || local.subcategoryId,
                                tagIds: (cp.tagIds && cp.tagIds.length > 0) ? cp.tagIds : local.tagIds,
                                // Merge other fields preference
                                name: cp.name || local.name,
                                manual_code: cp.manual_code || local.manual_code,
                                description: cp.description || local.description
                            });
                        } else {
                            localMap.set(cp.id, cp);
                        }
                    });
                    
                    const final = Array.from(localMap.values());
                    saveData('product_photos', final);
                    return final;
                });
            }

            if (cloudPhotos) {
                setCloudCount?.(cloudPhotos.length);
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
