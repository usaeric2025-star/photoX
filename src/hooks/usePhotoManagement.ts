import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Photo, Tag, ProductFormData } from '../types';
import { saveData, loadData } from '../utils/indexedDB';
import { resolveTagIdsBatch } from '../utils/tagUtils';
import { savePhotoToCloud, deletePhotoFromCloud, compressImage, calculateMD5, generateItemCode, checkImageHashExists, uploadImages } from '../services/supabaseService';

const INITIAL_FORM_STATE: ProductFormData = {
  name: '',
  categoryId: null,
  subcategoryId: null,
  tagIds: [],
  description: '',
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
  user: any,
  externalUI?: any,
  externalSession?: any
) => {
  const {
    photos, setPhotos,
    categories,
    tags, setTags, tagNameToIdMap, tagIdToNameMap,
    manufacturers
  } = useGalleryContext();

  const adminSession = useOptionalAdminSession() || externalSession;
  const adminUI = useOptionalAdminUI() || externalUI;
  const setAlertDialog = adminUI?.setAlertDialog || (() => {});
  const setLoadingState = adminUI?.setLoadingState || (() => {});
  const setActiveScreen = adminUI?.setActiveScreen || (() => {});

  const [newPhotoData, setNewPhotoData] = useState<string | null>(null);
  const [editPhotoId, setEditPhotoId] = useState<string | null>(null);
  const [batchEditIds, setBatchEditIds] = useState<string[] | null>(null);
  const [formState, setFormState] = useState<ProductFormData>(INITIAL_FORM_STATE);
  const [showOtherFields, setShowOtherFields] = useState(false);

  // Helper to update specific fields in formState
  const updateForm = useCallback((updates: Partial<ProductFormData> | ((prev: ProductFormData) => ProductFormData)) => {
    setFormState(prev => {
      const next = typeof updates === 'function' ? updates(prev) : ({ ...prev, ...updates });
      console.log("Form Updated, new state:", next);
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
          subcategoryId: photo.subcategoryId || null,
          tagIds: rawTagIds,
          description: photo.description || '',
          manual_code: photo.manual_code || '',
          model_number: photo.model_number || '',
          dimensions: dims as any[],
          isHidden: !!photo.isHidden,
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
        const allTagsSame = photosInBatch.every(p => 
          JSON.stringify([...(p.tagIds || [])].sort()) === JSON.stringify([...(firstPhoto.tagIds || [])].sort())
        );

        setFormState({
          ...INITIAL_FORM_STATE,
          categoryId: firstPhoto.categoryId || null,
          subcategoryId: firstPhoto.subcategoryId || null,
          tagIds: allTagsSame ? (firstPhoto.tagIds || []) : [],
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
      name, categoryId, subcategoryId, tagIds, description, 
      manual_code, model_number, dimensions, isHidden, price,
      dimL, dimW, dimH
    } = formState;

    console.log("Saving new photo, formState.name:", name);

    if (!categoryId && !name && !editPhotoId && !newPhotoData) {
       setAlertDialog({ title: '提示', message: '請填寫基本資訊或選擇分類' });
       return;
    }

    setLoadingState('syncing');
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
            subcategoryId: subcategoryId,
            tagIds: finalTagIds,
            description: description,
            manual_code: manual_code,
            model_number: model_number,
            isHidden: isHidden,
            price: price,
            dimensions: finalDimensions,
            updatedAt: new Date().toISOString()
          };

          setPhotos(prev => {
            const nextPhotos = (prev as Photo[]).map(p => p.id === editPhotoId ? updatedPhoto : p);
            saveData('product_photos', nextPhotos);
            return nextPhotos;
          });
          
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
            description: description,
            image_url: '',
            uri: newPhotoData,
            categoryId: categoryId,
            subcategoryId: subcategoryId,
            tagIds: finalTagIds,
            isHidden: isHidden,
            price: price,
            dimensions: finalDimensions,
            createdAt: new Date().toISOString(),
            groupId: null
          };

          setPhotos(prev => {
            const nextPhotos = [newPhoto, ...(prev as Photo[])];
            saveData('product_photos', nextPhotos);
            return nextPhotos;
          });
          
          if (user) {
            await savePhotoToCloud(user.id, newPhoto);
          }
       }
       
       resetAddState();
       setActiveScreen('home');
    } catch (err: any) {
       setAlertDialog({ title: '儲存失敗', message: err.message });
    } finally {
       setLoadingState('idle');
    }
  };

  const saveBatchEdit = async (batchIsHiddenApplied: boolean = false) => {
     if (!batchEditIds) return;
     const { 
       name, categoryId, subcategoryId, tagIds, description, 
       manual_code, model_number, isHidden, price
     } = formState;

     setLoadingState('syncing');
     try {
        // Resolve tag names to IDs
        const finalTagIds = await resolveTagIdsBatch(tagIds, tags, tagNameToIdMap, setTags);

        const updatedPhotosList: Photo[] = [];
        setPhotos(prev => {
          const next = prev.map(p => {
             if (batchEditIds.includes(p.id)) {
                const updated = {
                  ...p,
                  name: name || p.name,
                  categoryId: categoryId || p.categoryId,
                  subcategoryId: subcategoryId || p.subcategoryId,
                  tagIds: finalTagIds.length > 0 ? finalTagIds : (Array.isArray(p.tagIds) ? p.tagIds.map(String) : []),
                  description: description || p.description,
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
          saveData('product_photos', next);
          return next;
        });
        
        if (user) {
           await Promise.allSettled(
             updatedPhotosList.map(photo => 
               savePhotoToCloud(user.id, photo)
             )
           );
        }
        
        resetAddState();
        setActiveScreen('home');
     } catch (err: any) {
        setAlertDialog({ title: '批量儲存失敗', message: err.message });
     } finally {
        setLoadingState('idle');
     }
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
