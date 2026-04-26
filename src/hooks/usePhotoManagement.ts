import { useState, useRef, useMemo, useEffect } from 'react';
import { Photo, Tag, ProductFormData } from '../types';
import { saveData, loadData } from '../utils/indexedDB';
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
};

import { useGalleryContext } from '../context/GalleryContext';

export const usePhotoManagement = (
  user: any,
  setAlertDialog: (a: any) => void,
  setIsSyncing: (s: boolean) => void,
  setActiveScreen: (s: any) => void
) => {
  const {
    photos, setPhotos,
    categories,
    tags,
    dbCategories,
    manufacturers
  } = useGalleryContext();

  const [newPhotoData, setNewPhotoData] = useState<string | null>(null);
  const [editPhotoId, setEditPhotoId] = useState<string | null>(null);
  const [batchEditIds, setBatchEditIds] = useState<string[] | null>(null);
  const [formState, setFormState] = useState<ProductFormData>(INITIAL_FORM_STATE);
  const [showOtherFields, setShowOtherFields] = useState(false);

  // Helper to update specific fields in formState
  const updateForm = (updates: Partial<ProductFormData> | ((prev: ProductFormData) => ProductFormData)) => {
    setFormState(prev => {
      const next = typeof updates === 'function' ? updates(prev) : ({ ...prev, ...updates });
      console.log("Form Updated, new state:", next);
      return next;
    });
  };

  useEffect(() => {
    if (editPhotoId) {
      const photo = photos.find(p => p.id === editPhotoId);
      if (photo) {
        const initialCatId = photo.categoryId || (photo.category ? dbCategories.find(c => c.zh === photo.category || c.en === photo.category || c.code === photo.category)?.code : null);
        
        // Healing for Manufacturers: if ID is missing but name string exists, find the ID
        const initialMfrId = photo.subcategoryId || (photo.sub_category ? manufacturers.find(m => m.name === photo.sub_category)?.id : null);
        
        const rawTagIds = Array.isArray(photo.tagIds) && photo.tagIds.length > 0 ? photo.tagIds : 
                          (Array.isArray(photo.tags) ? photo.tags.map(tagName => tags.find(t => t.name === tagName)?.id).filter(Boolean) as string[] : []);
        
        console.log("Healing tags for photo", photo.id, { rawTagIds, photoTagIds: photo.tagIds, photoTags: photo.tags });
        
        const dims = Array.isArray(photo.dimensions) ? photo.dimensions : [];

        setFormState({
          name: photo.name || '',
          categoryId: initialCatId ? String(initialCatId) : null,
          subcategoryId: initialMfrId || null,
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
      }
    }
  }, [editPhotoId, photos, dbCategories, manufacturers, tags]);

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

    if (!categoryId && !name && !editPhotoId && !newPhotoData) {
       setAlertDialog({ title: '提示', message: '請填寫基本資訊或選擇分類' });
       return;
    }

    setIsSyncing(true);
    try {
       const finalTags = tags.filter(t => tagIds.includes(t.id)).map(t => t.name);
       const categoryName = dbCategories.find(c => c.code === categoryId)?.zh || '';
       const manufacturerName = manufacturers.find(m => m.id === subcategoryId)?.name || '';

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
            tagIds: tagIds,
            category: categoryName || original.category,
            sub_category: subcategoryId ? (manufacturerName || original.sub_category) : '',
            tags: finalTags,
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
          const dbId = crypto.randomUUID();
          const finalDimensions = dimensions.length > 0 ? dimensions : [{
            length: parseFloat(dimL || '0') || 0,
            width: parseFloat(dimW || '0') || 0,
            height: parseFloat(dimH || '0') || 0,
            unit: 'cm'
          }];

          const newPhoto: Photo = {
            id: dbId,
            storageId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            item_code: generateItemCode(),
            manual_code: manual_code,
            model_number: model_number,
            image_hash: calculateMD5(newPhotoData),
            name: name || '未命名产品',
            category: categoryName || '未分类',
            sub_category: manufacturerName,
            tags: finalTags,
            description: description,
            image_url: '',
            uri: newPhotoData,
            categoryId: categoryId,
            subcategoryId: subcategoryId,
            tagIds: tagIds,
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
       setIsSyncing(false);
    }
  };

  const saveBatchEdit = async (batchIsHiddenApplied: boolean = false) => {
     if (!batchEditIds) return;
     const { 
       categoryId, subcategoryId, tagIds, description, 
       manual_code, model_number, isHidden, price
     } = formState;

     setIsSyncing(true);
     try {
        const finalTags = tags.filter(t => tagIds.includes(t.id)).map(t => t.name);
        const categoryName = dbCategories.find(c => c.code === categoryId)?.zh || '';
        const manufacturerName = manufacturers.find(m => m.id === subcategoryId)?.name || '';

        const updatedPhotosList: Photo[] = [];
        setPhotos(prev => {
          const next = prev.map(p => {
             if (batchEditIds.includes(p.id)) {
                const updated = {
                  ...p,
                  categoryId: categoryId || p.categoryId,
                  subcategoryId: subcategoryId || p.subcategoryId,
                  tagIds: tagIds.length > 0 ? tagIds : p.tagIds,
                  category: categoryName || p.category,
                  sub_category: subcategoryId ? (manufacturerName || p.sub_category) : p.sub_category,
                  tags: finalTags.length > 0 ? finalTags : p.tags,
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
           for (const photo of updatedPhotosList) {
              savePhotoToCloud(user.id, photo).catch(e => console.error("Batch sync failed for", photo.id, e));
           }
        }
        
        resetAddState();
        setActiveScreen('home');
     } catch (err: any) {
        setAlertDialog({ title: '批量儲存失敗', message: err.message });
     } finally {
        setIsSyncing(false);
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
