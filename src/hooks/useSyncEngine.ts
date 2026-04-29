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

export const useSyncEngine = (setLoadingState?: (s: 'idle' | 'syncing' | 'analyzing' | 'importing') => void) => {
    const { 
        setPhotos: setPublicPhotos, 
        setCategories, 
        setTags, 
        setManufacturers 
    } = useGalleryContext();

    const [internalSyncing, setInternalSyncing] = React.useState(false);
    const setIsSyncing = (val: boolean) => {
        if (setLoadingState) {
            setLoadingState(val ? 'syncing' : 'idle');
        } else {
            setInternalSyncing(val);
        }
    };
    const isSyncing = setLoadingState ? false : internalSyncing;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const refreshCloudData = async (
        user: any,
        force = false,
        setCloudCount?: (c: number | null) => void,
        setPublicCategories?: (c: any) => void,
        setPublicTags?: (t: any) => void,
        setPublicManufacturers?: (m: any) => void
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
            }

            // --- Load Manufacturers Relational ---
            const cloudManufacturers = await loadManufacturersFromCloud();
            if (cloudManufacturers) {
                setManufacturers(cloudManufacturers);
                setPublicManufacturers?.(cloudManufacturers);
                await saveData('product_manufacturers', cloudManufacturers);
            }

            // --- Load Tags Relational ---
            const cloudTags = await loadTagsFromCloud();
            if (cloudTags) {
              setTags?.(cloudTags);
              setPublicTags?.(cloudTags);
              await saveData('product_tags', cloudTags);
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
                
                setCategories(normalized);
                setPublicCategories?.(normalized);
                await saveData('product_categories', normalized);
            } else {
                setCategories([]);
                setPublicCategories?.([]);
                await saveData('product_categories', []);
            }

            const lastSyncTime = localStorage.getItem('lastSyncTime');
            const cloudPhotos = user 
                ? await loadPhotosFromCloud(user.id, lastSyncTime || undefined) 
                : await loadAllPhotosFromCloud(lastSyncTime || undefined);
            
            // Get current local state to merge properly and get total count
            const localPhotos = await loadData('product_photos') || [];
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
            
            localStorage.setItem('lastSyncTime', new Date().toISOString());
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
        refreshCloudData,
        handleLogoUpload
    };
};
