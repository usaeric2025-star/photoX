import React, { useState } from 'react';
import { toast } from 'sonner';
import { Photo } from '../types';
import { cleanPhotos } from '../lib/filters';
import { saveData, loadData } from '../utils/indexedDB';
import { 
    loadAllPhotosFromCloud, 
    loadPhotosFromCloud,
} from '../services/photoService';
import {
    savePhotoToCloud,
    deletePhotoFromCloud,
} from '../services/photoMutationService';
import { fetchSettings, saveSettings } from '../services/settingService';
import { loadCategoriesFromCloud } from '../services/categoryService';
import { loadTagsFromCloud } from '../services/tagService';
import { loadManufacturersFromCloud } from '../services/manufacturerService';
import { uploadLogo } from '../services/settingService';

import { useGallery } from './useGallery';
import { useErrorHandler } from '../utils/errorHandler';

export const useSyncEngine = (withLoading?: <T>(s: 'idle' | 'syncing' | 'analyzing' | 'importing', fn: () => Promise<T>) => Promise<T>) => {
    const { 
        setPhotos: setPublicPhotos, 
        setCategories, 
        setTags, 
        setManufacturers,
        setVisibleCount
    } = useGallery();

    const { handleError } = useErrorHandler();

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
                fetchSettings().catch(err => { handleError(err, '获取设置失败'); return null; }),
                loadManufacturersFromCloud().catch(err => { handleError(err, '获取厂商失败'); return null; }),
                loadTagsFromCloud().catch(err => { handleError(err, '获取标签失败'); return null; }),
                loadCategoriesFromCloud().catch(err => { handleError(err, '获取分类失败'); return []; }),
                loadAllPhotosFromCloud(effectiveSyncTime || undefined).catch(err => { handleError(err, '获取照片列表失败'); return []; })
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

            const finalPhotos = cleanPhotos(Array.from(localMap.values()));
            setPublicPhotos(finalPhotos);
            await saveData('product_photos', finalPhotos);
            
            // Always set cloud count to the total photos length
            if (setCloudCount) {
                setCloudCount(finalPhotos.length);
            }
            
            if (!effectiveSyncTime) {
              console.log("SyncEngine: Full sync complete, setting visibleCount to cover all photos.");
              setVisibleCount?.(Math.max(100, finalPhotos.length + 50));
            }

            localStorage.setItem('lastSyncTime', new Date().toISOString());
        } catch (err) {
            handleError(err, '云端同步失败');
            throw err;
        }
        });
    }

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, categories: any[], tags: any[], manufacturers: any[]) => {
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
                toast.success('上传成功: 品牌 Logo 已更新');
            } catch (err: any) {
                handleError(err, 'Logo 上传失败');
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
