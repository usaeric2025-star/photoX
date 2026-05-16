import React, { useState } from 'react';
import { toast } from 'sonner';
import { Photo } from '../types';
import { cleanPhotos } from '../lib/filters';
import { saveData, loadData } from '../utils/indexedDB';
import { 
    loadAllPhotosFromCloud, 
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

import { useQueryClient } from '@tanstack/react-query';
import { useGalleryStore } from '../store';
import { QUERY_KEYS } from './queries/keys';
import { useErrorHandler } from '../utils/errorHandler';
import { PAGINATION } from '../constants/config';

export const useSyncEngine = (withLoading?: <T>(s: 'idle' | 'sync-pull' | 'sync-push' | 'analyzing' | 'importing' | 'compressing' | 'uploading' | 'saving' | 'deleting', fn: () => Promise<T>) => Promise<T>) => {
    const queryClient = useQueryClient();
    const { isAdminMode } = useGalleryStore();

    const { handleError } = useErrorHandler();

    const [internalSyncType, setInternalSyncType] = React.useState<'idle' | 'sync-pull' | 'sync-push' | null>(null);

    const runWithSyncing = async <T,>(type: 'sync-pull' | 'sync-push', fn: () => Promise<T>): Promise<T> => {
        if (withLoading) {
            return await withLoading(type, fn);
        } else {
            setInternalSyncType(type);
            try {
                return await fn();
            } finally {
                setInternalSyncType(null);
            }
        }
    };

    const isSyncing = withLoading ? false : internalSyncType !== null;
    const currentSyncType = internalSyncType;
    const [viewMode, setViewMode] = useState<'public' | 'private'>('private');
    const [settings, setSettings] = useState<any>(null);

    React.useEffect(() => {
        const initSettings = async () => {
            // Cleanup legacy localStorage data
            const hasCleaned = await loadData('uuid_v2_cleanup_done');
            if (!hasCleaned) {
                console.log("SyncEngine: Performing one-time cleanup of legacy local data...");
                const keysToClear = ['product_categories', 'db_categories', 'product_tags', 'temp_tags'];
                for (const key of keysToClear) {
                    await saveData(key, null);
                }
                await saveData('uuid_v2_cleanup_done', true);
            }

            let s = await loadData('product_settings');
            if (!s) {
                const oldS = await loadData('public_settings');
                if (oldS) {
                    s = oldS;
                    await saveData('product_settings', oldS);
                }
            }
            if (s && !settings) setSettings(s);
        };
        initSettings();
    }, []);

    /**
     * Data fetcher that handles paging internally
     */
    const fetchAllPages = async (syncTime?: string | null): Promise<any[]> => {
        let allPhotos: any[] = [];
        let page = 0;
        let hasMore = true;
        const pageSize = PAGINATION.SYNC_PAGE_SIZE;

        while (hasMore) {
            const pagePhotos = await loadAllPhotosFromCloud(syncTime || undefined, page, pageSize)
                .catch(err => { 
                    handleError(err, '获取照片分页数据失败'); 
                    return []; 
                });
            
            if (pagePhotos.length > 0) {
                allPhotos = allPhotos.concat(pagePhotos);
                page++;
            }
            
            if (pagePhotos.length < pageSize) {
                hasMore = false;
            }
        }
        return allPhotos;
    };

    const refreshCloudData = async (
        user: any,
        force = false,
        setCloudCount?: (c: number | null) => void
    ) => {
        return runWithSyncing('sync-pull', async () => {
            console.log(`SyncEngine: Invalidating queries...`);
            try {
                // Invalidate all related queries
                await queryClient.invalidateQueries({ queryKey: ['photos'] });
                await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
                await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
                await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.manufacturers });
                
                // Fetch settings separately as they aren't in RQ yet
                const cloudSettings = await fetchSettings().catch(err => { handleError(err, '获取设置失败'); return null; });
                if (cloudSettings) {
                    setSettings(cloudSettings);
                    await saveData('product_settings', cloudSettings);
                }
                
                // Fetch count for UI
                const realCloudCount = await import('../services/photoService').then(m => m.getPhotoCount()).catch(() => null);
                if (setCloudCount) {
                    setCloudCount(realCloudCount);
                }
                
                localStorage.setItem('lastSyncTime', new Date().toISOString());
                console.log(`SyncEngine: Refresh triggered.`);
            } catch (err) {
                handleError(err, '云端同步异常');
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
        isSyncing,
        currentSyncType,
        viewMode, setViewMode,
        settings, setSettings,
        refreshCloudData,
        handleLogoUpload,
        setIsSyncing: (v: boolean) => setInternalSyncType(v ? 'sync-pull' : null)
    };
};
