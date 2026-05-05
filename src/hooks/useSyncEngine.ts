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
    loadTagsFromCloud,
    loadManufacturersFromCloud
} from '../services/supabaseService';

import { useGalleryContext } from '../context/GalleryContext';

export const useSyncEngine = (withLoading?: <T>(s: 'idle' | 'syncing' | 'analyzing' | 'importing', fn: () => Promise<T>) => Promise<T>) => {
    const { 
        setPhotos: setPublicPhotos, 
        setCategories, 
        setTags, 
        setManufacturers,
        setVisibleCount
    } = useGalleryContext();

    const [internalSyncing, setInternalSyncing] = React.useState(false);

    // wrapper that executes with withLoading if provided
    const runWithSyncing = async <T,>(fn: () => Promise<T>): Promise<T> => {
        if (withLoading) {
            return await withLoading('syncing', fn);
        } else {
            setInternalSyncing(true);
            try {
                return await fn();
            } finally {
                setInternalSyncing(false);
            }
        }
    };

    const isSyncing = withLoading ? false : internalSyncing;
    const setIsSyncing = (v: boolean) => setInternalSyncing(v);
    const [viewMode, setViewMode] = useState<'public' | 'private'>('private');
    const [settings, setSettings] = useState<any>(null);

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
        };
        initSettings();
    // Run this effect only once on mount to perform initial data loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const refreshCloudData = async (
        user: any,
        force = false,
        setCloudCount?: (c: number | null) => void
    ) => {
        return runWithSyncing(async () => {
        console.log("SyncEngine: Refreshing data (Force:", force, ")...");
        try {
            // Get current local state to merge properly
            const localPhotos = await loadData('product_photos') || [];
            
            // If local data is empty, force a full sync regardless of 'force' param
            const effectiveSyncTime = (force || localPhotos.length === 0) ? null : localStorage.getItem('lastSyncTime');
            
            const [cloudSettings, cloudManufacturers, cloudTags, cloudCategories, cloudPhotos] = await Promise.all([
                fetchSettings().catch(err => { console.error("fetchSettings failed:", err); return null; }),
                loadManufacturersFromCloud().catch(err => { console.error("loadManufacturersFromCloud failed:", err); return null; }),
                loadTagsFromCloud().catch(err => { console.error("loadTagsFromCloud failed:", err); return null; }),
                loadCategoriesFromCloud().catch(err => { console.error("loadCategoriesFromCloud failed:", err); return []; }),
                loadAllPhotosFromCloud(effectiveSyncTime || undefined).catch(err => { console.error("loadAllPhotosFromCloud failed:", err); return []; })
            ]);

            if (cloudSettings) {
                setSettings(cloudSettings);
                await saveData('product_settings', cloudSettings);
                
                // Sync theme
                if (cloudSettings.background_color) document.documentElement.style.setProperty('--custom-bg', cloudSettings.background_color);
                if (cloudSettings.primary_color) document.documentElement.style.setProperty('--custom-text', cloudSettings.primary_color);
                if (cloudSettings.accent_color) document.documentElement.style.setProperty('--custom-accent', cloudSettings.accent_color);
            }

            if (cloudManufacturers) {
                setManufacturers(cloudManufacturers);
                await saveData('product_manufacturers', cloudManufacturers);
            }

            if (cloudTags) {
              setTags?.(cloudTags);
              await saveData('product_tags', cloudTags);
            }

            if (cloudCategories && cloudCategories.length > 0) {
                const normalized = cloudCategories.map(c => ({
                  ...c,
                  id: String(c.id),
                  name: c.name || c.zh || 'Uncategorized',
                  subcategories: c.subcategories || [] 
                }));
                
                setCategories(normalized);
                await saveData('product_categories', normalized);
            } else {
                setCategories([]);
                await saveData('product_categories', []);
            }
            
            // Get current local state to merge properly and get total count
            const localMap = new Map((localPhotos as any[]).filter(p => p && p.id).map(p => [p.id, p]));

            if (cloudPhotos && cloudPhotos.length > 0) {
                console.log(`SyncEngine: Received ${cloudPhotos.length} new/updated items.`);
                cloudPhotos.forEach(cp => {
                    const local = localMap.get(cp.id);
                    if (local) {
                        localMap.set(cp.id, {
                            ...local,
                            ...cp,
                            categoryId: cp.categoryId || local.categoryId,
                            manufacturerId: cp.manufacturerId || local.manufacturerId,
                            tagIds: (cp.tagIds && cp.tagIds.length > 0) ? cp.tagIds : local.tagIds,
                            name: cp.name || local.name,
                            manual_code: cp.manual_code || local.manual_code,
                            description: cp.description || local.description
                        });
                    } else {
                        localMap.set(cp.id, cp);
                    }
                });
            }

            const finalPhotos = Array.from(localMap.values());
            setPublicPhotos(finalPhotos);
            await saveData('product_photos', finalPhotos);
            
            // Always set cloud count to the total photos length
            if (setCloudCount) {
                setCloudCount(finalPhotos.length);
            }
            
            if (!lastSyncTime) {
              console.log("SyncEngine: Full sync complete, setting visibleCount to cover all photos.");
              setVisibleCount?.(Math.max(100, finalPhotos.length + 50));
            }

            localStorage.setItem('lastSyncTime', new Date().toISOString());
        } catch (err) {
            console.error("Cloud synchronization failed:", err);
            throw err;
        }
        });
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, categories: any[], tags: any[], manufacturers: any[], showToast: (msg: string, type: 'success'|'error') => void) => {
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
                showToast('上傳成功: 品牌 Logo 已更新', 'success');
            } catch (err: any) {
                console.error("Logo upload failed:", err);
                showToast(`上傳失敗: ${err.message || '請檢查網路連線或儲存空間權限'}`, 'error');
            }
        }
    };

    return { 
        isSyncing, setIsSyncing,
        viewMode, setViewMode,
        settings, setSettings,
        refreshCloudData,
        handleLogoUpload
    };
};
