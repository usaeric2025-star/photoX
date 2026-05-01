import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Photo, Tag, ProductFormData } from '../types';
import { saveData, loadData } from '../utils/indexedDB';
import { resolveTagIdsBatch } from '../utils/tagUtils';
import { savePhotoToCloud, deletePhotoFromCloud, compressImage, calculateMD5, generateItemCode, checkImageHashExists, uploadImages } from '../services/supabaseService';

const INITIAL_FORM_STATE: ProductFormData = {
  name: '',
  categoryId: null,
  manufacturerId: null,
  tagIds: [],
  description: '',
  description_translations: { zh: '', en: '', ms: '' },
  manual_code: '',
  model_number: '',
  dimensions: [],
  isHidden: false,
  price: '',
  dimL: '',
  dimW: '',
  dimH: '',
  isGroupCover: false,
};

import { useGalleryContext } from '../context/GalleryContext';

import { useOptionalAdminSession, useOptionalAdminUI } from '../context/AdminContexts';

export const usePhotoManagement = (
  user: {id: string} | null,
  adminUI?: {
    setAlertDialog: (d: any) => void;
    showToast?: (msg: string, type: 'success'|'error') => void;
    setActiveScreen: (s: string) => void;
    editPhotoId?: string | null;
    setEditPhotoId?: (id: string | null) => void;
    batchEditIds?: string[] | null;
    setBatchEditIds?: (ids: string[] | null) => void;
    batchProgress?: { current: number, total: number };
    setBatchProgress?: (p: { current: number, total: number }) => void;
    withLoading?: <T>(state: string, fn: () => Promise<T>) => Promise<T>;
  },
  adminSession?: any
) => {
  const {
    photos, setPhotos,
    categories,
    tags, setTags, tagNameToIdMap, tagIdToNameMap,
    manufacturers
  } = useGalleryContext();

  const { 
    setAlertDialog = () => {}, 
    showToast = () => {},
    setActiveScreen = () => {},
    editPhotoId: externalEditPhotoId,
    setEditPhotoId: externalSetEditPhotoId,
    batchEditIds: externalBatchEditIds,
    setBatchEditIds: externalSetBatchEditIds
  } = adminUI || {};

  const [internalEditPhotoId, internalSetEditPhotoId] = useState<string | null>(null);
  const [internalBatchEditIds, internalSetBatchEditIds] = useState<string[] | null>(null);

  const editPhotoId = externalSetEditPhotoId ? externalEditPhotoId : internalEditPhotoId;
  const setEditPhotoId = externalSetEditPhotoId || internalSetEditPhotoId;
  const batchEditIds = externalSetBatchEditIds ? externalBatchEditIds : internalBatchEditIds;
  const setBatchEditIds = externalSetBatchEditIds || internalSetBatchEditIds;

  const [newPhotoData, setNewPhotoData] = useState<string | null>(null);
  const [formState, setFormState] = useState<ProductFormData>(INITIAL_FORM_STATE);
  const [showOtherFields, setShowOtherFields] = useState(false);

  // Helper to update specific fields in formState
  const updateForm = useCallback((updates: Partial<ProductFormData> | ((prev: ProductFormData) => ProductFormData)) => {
    setFormState(prev => {
      const next = typeof updates === 'function' ? updates(prev) : ({ ...prev, ...updates });
      return next;
    });
  }, []);

  const lastInitializedId = useRef<string | null>(null);

  useEffect(() => {
    if (editPhotoId) {
      if (editPhotoId === lastInitializedId.current) return; // Already initialized this photo

      const photo = photos.find(p => p.id === editPhotoId);
      if (photo) {
        const rawTagIds = (Array.isArray(photo.tagIds) ? photo.tagIds : []).map(String);
        const dims = Array.isArray(photo.dimensions) ? photo.dimensions : [];

        setFormState({
          name: photo.name || '',
          categoryId: photo.categoryId || null,
          manufacturerId: photo.manufacturerId || null,
          tagIds: rawTagIds,
          description: photo.description || '',
          description_translations: photo.description_translations || { zh: photo.description || '', en: '', ms: '' },
          manual_code: photo.manual_code || '',
          model_number: photo.model_number || '',
          dimensions: dims as any[],
          isHidden: !!photo.isHidden,
          isGroupCover: !!photo.isGroupCover,
          price: photo.price || '',
          dimL: dims[0]?.length?.toString() || '',
          dimW: dims[0]?.width?.toString() || '',
          dimH: dims[0]?.height?.toString() || '',
        });
        lastInitializedId.current = editPhotoId;
      }
    } else {
      lastInitializedId.current = null;
    }
  }, [editPhotoId, photos]); 

  const lastInitializedBatchIds = useRef<string | null>(null);

  useEffect(() => {
    if (batchEditIds && batchEditIds.length > 0) {
      const batchKey = batchEditIds.sort().join(',');
      if (batchKey === lastInitializedBatchIds.current) return;

      const photosInBatch = photos.filter(p => batchEditIds.includes(p.id));
      if (photosInBatch.length > 0) {
        const firstPhoto = photosInBatch[0];
        
        // Calculate intersection of tags present in all photos
        const intersectionTagIds = photosInBatch.reduce((acc, photo) => {
            const photoTagIds = (photo.tagIds || []).map(String);
            return acc.filter(tagId => photoTagIds.includes(String(tagId)));
        }, (firstPhoto.tagIds || []).map(String));

        setFormState({
          ...INITIAL_FORM_STATE,
          description: null as any,
          description_translations: null as any,
          categoryId: firstPhoto.categoryId || null,
          manufacturerId: firstPhoto.manufacturerId || null,
          tagIds: intersectionTagIds,
        });
        lastInitializedBatchIds.current = batchKey;
      }
    } else {
      lastInitializedBatchIds.current = null;
    }
  }, [batchEditIds, photos]);

  const resetAddState = () => {
    setNewPhotoData(null);
    setEditPhotoId(null);
    setBatchEditIds(null);
    setFormState(INITIAL_FORM_STATE);
    setShowOtherFields(false);
  };

  const saveNewPhoto = async () => {
    const { 
      name, categoryId, manufacturerId, tagIds, description, description_translations,
      manual_code, model_number, dimensions, isHidden, price,
      dimL, dimW, dimH
    } = formState;

    if (!categoryId && !name && !editPhotoId && !newPhotoData) {
       showToast('請填寫基本資訊或選擇分類', 'error');
       return;
    }

    const run = adminUI?.withLoading ? adminUI.withLoading.bind(null, 'syncing') : async (fn:any) => fn();
    await run(async () => {
       try {
           // Resolve tag names to IDs
          const finalTagIds = await resolveTagIdsBatch(tagIds, tags, tagNameToIdMap, setTags);

       if (editPhotoId) {
          const original = photos.find(p => p.id === editPhotoId);
          if (!original) throw new Error('Photo not found');

          const finalDimensions = dimensions.length > 0 ? dimensions : [{
            length: parseFloat(dimL || '0') || 0,
            width: parseFloat(dimW || '0') || 0,
            height: parseFloat(dimH || '0') || 0,
            unit: 'cm'
          }];

          const updatedPhoto: Photo = {
            ...original,
            name: name || original.name,
            categoryId: categoryId,
            manufacturerId: manufacturerId,
            tagIds: finalTagIds,
            description: description || '',
            description_translations: description_translations || { zh: '', en: '', ms: '' },
            manual_code: manual_code,
            model_number: model_number,
            isHidden: isHidden,
            isGroupCover: formState.isGroupCover || false,
            price: price,
            dimensions: finalDimensions,
            updatedAt: new Date().toISOString()
          };

          const nextPhotos = photos.map(p => p.id === editPhotoId ? updatedPhoto : p);
          setPhotos(nextPhotos);
          await saveData('product_photos', nextPhotos);
          
          if (user) {
             await savePhotoToCloud(user.id, updatedPhoto);
          }
       } else if (newPhotoData) {
          const finalId = crypto.randomUUID();
          const finalDimensions = dimensions.length > 0 ? dimensions : [{
            length: parseFloat(dimL || '0') || 0,
            width: parseFloat(dimW || '0') || 0,
            height: parseFloat(dimH || '0') || 0,
            unit: 'cm'
          }];

          const newPhoto: Photo = {
            id: finalId,
            storageId: finalId,
            item_code: generateItemCode(),
            manual_code: manual_code,
            model_number: model_number,
            image_hash: calculateMD5(newPhotoData),
            name: name || '未命名产品',
            description: description || '',
            description_translations: description_translations || { zh: '', en: '', ms: '' },
            image_url: '',
            uri: newPhotoData,
            categoryId: categoryId,
            manufacturerId: manufacturerId,
            tagIds: finalTagIds,
            isHidden: isHidden,
            price: price,
            dimensions: finalDimensions,
            createdAt: new Date().toISOString(),
            groupId: null
          };

          const nextPhotos = [newPhoto, ...photos];
          setPhotos(nextPhotos);
          await saveData('product_photos', nextPhotos);
          
          if (user) {
            await savePhotoToCloud(user.id, newPhoto);
          }
       }
       
       resetAddState();
       setActiveScreen('home');
       } catch (err: any) {
          showToast(`儲存失敗: ${err.message}`, 'error');
       }
    });
  };

  const saveBatchEdit = async (batchIsHiddenApplied: boolean = false) => {
     if (!batchEditIds) return;
     const { 
       name, categoryId, manufacturerId, tagIds, description, description_translations,
       manual_code, model_number, isHidden, price
     } = formState;

     const run = adminUI?.withLoading ? adminUI.withLoading.bind(null, 'syncing') : async (fn:any) => fn();
     if (adminUI?.setBatchProgress) {
        adminUI.setBatchProgress({ current: 0, total: batchEditIds.length });
     }

     await run(async () => {
        try {
           // Resolve tag names to IDs
           const finalTagIds = await resolveTagIdsBatch(tagIds, tags, tagNameToIdMap, setTags);

        const updatedPhotosList: Photo[] = [];
        const nextPhotos = photos.map(p => {
             if (batchEditIds.includes(p.id)) {
                const updated = {
                  ...p,
                  name: name || p.name,
                  categoryId: categoryId || p.categoryId,
                  manufacturerId: manufacturerId || p.manufacturerId,
                  tagIds: (finalTagIds?.length || 0) > 0 ? finalTagIds : (Array.isArray(p.tagIds) ? p.tagIds.map(String) : []),
                  description: description !== null ? description : p.description,
                  description_translations: description_translations !== null ? description_translations : p.description_translations,
                  manual_code: manual_code || p.manual_code,
                  model_number: model_number || p.model_number,
                  isHidden: batchIsHiddenApplied ? isHidden : p.isHidden,
                  price: price || p.price,
                  updatedAt: new Date().toISOString()
                };
                updatedPhotosList.push(updated);
                return updated;
             }
             return p;
        });

        setPhotos(nextPhotos);
        await saveData('product_photos', nextPhotos);
        
        if (user) {
           try {
              const m = await import('../services/photoService');
              if (m.savePhotosToCloudBatch) {
                 await m.savePhotosToCloudBatch(user.id, updatedPhotosList, (count) => {
                    if (adminUI?.setBatchProgress) {
                       adminUI.setBatchProgress({ current: count, total: updatedPhotosList.length });
                    }
                 });
              } else {
                let count = 0;
                const chunkSize = 5;
                for (let i = 0; i < updatedPhotosList.length; i += chunkSize) {
                  const chunk = updatedPhotosList.slice(i, i + chunkSize);
                  await Promise.all(chunk.map(photo => savePhotoToCloud(user.id, photo)));
                  count += chunk.length;
                  if (adminUI?.setBatchProgress) {
                     adminUI.setBatchProgress({ current: count, total: updatedPhotosList.length });
                  }
                }
              }
           } catch (err: any) {
              console.error("Batch save error:", err);
              throw err;
           }
        }
        
           resetAddState();
           setActiveScreen('home');
        } catch (err: any) {
           showToast(`批量儲存失敗: ${err.message}`, 'error');
        } finally {
           if (adminUI?.setBatchProgress) {
             adminUI.setBatchProgress({ current: 0, total: 0 });
           }
        }
     });
  };

  return {
    newPhotoData, setNewPhotoData,
    editPhotoId, setEditPhotoId,
    batchEditIds, setBatchEditIds,
    formState, updateForm,
    showOtherFields, setShowOtherFields,
    resetAddState,
    saveNewPhoto,
    saveBatchEdit
  };
};
