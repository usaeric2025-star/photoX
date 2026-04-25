import { useState, useRef, useMemo, useEffect } from 'react';
import { Photo, Tag } from '../types';
import { saveData, loadData } from '../utils/indexedDB';
import { savePhotoToCloud, deletePhotoFromCloud, compressImage, calculateMD5, generateItemCode, checkImageHashExists, uploadImages } from '../services/supabaseService';

export const usePhotoManagement = (
  user: any,
  photos: Photo[],
  setPhotos: (p: Photo[] | ((prev: Photo[]) => Photo[])) => void,
  categories: any[],
  tags: Tag[],
  dbCategories: any[],
  manufacturers: any[],
  setAlertDialog: (a: any) => void,
  setIsSyncing: (s: boolean) => void,
  setActiveScreen: (s: any) => void
) => {
  const [newPhotoData, setNewPhotoData] = useState<string | null>(null);
  const [editPhotoId, setEditPhotoId] = useState<string | null>(null);
  const [batchEditIds, setBatchEditIds] = useState<string[] | null>(null);
  const [addCatId, setAddCatId] = useState<string | null>(null);
  const [addSubId, setAddSubId] = useState<string | null>(null);
  const [addTagIds, setAddTagIds] = useState<string[]>([]);
  const [addNote, setAddNote] = useState('');
  const [addName, setAddName] = useState('');
  const [addManualCode, setAddManualCode] = useState('');
  const [addDimL, setAddDimL] = useState<string>('');
  const [addDimW, setAddDimW] = useState<string>('');
  const [addDimH, setAddDimH] = useState<string>('');
  const [showOtherFields, setShowOtherFields] = useState(false);

  useEffect(() => {
    if (editPhotoId) {
      const photo = photos.find(p => p.id === editPhotoId);
      if (photo) {
        setAddName(photo.name || '');
        setAddCatId(photo.categoryId || null);
        setAddSubId(photo.subcategoryId || null);
        setAddTagIds(photo.tagIds || []);
        setAddNote(photo.description || '');
        setAddManualCode(photo.manual_code || '');
        setAddDimL(photo.dimensions?.length?.toString() || '');
        setAddDimW(photo.dimensions?.width?.toString() || '');
        setAddDimH(photo.dimensions?.height?.toString() || '');
      }
    }
  }, [editPhotoId, photos]);

  const resetAddState = () => {
    setNewPhotoData(null);
    setEditPhotoId(null);
    setBatchEditIds(null);
    setAddCatId(null);
    setAddSubId(null);
    setAddTagIds([]);
    setAddNote('');
    setAddName('');
    setAddManualCode('');
    setAddDimL('');
    setAddDimW('');
    setAddDimH('');
    setShowOtherFields(false);
  };

  const saveNewPhoto = async () => {
    // Basic validation only for new photos without any info
    if (!addCatId && !addName && !editPhotoId && !newPhotoData) {
       setAlertDialog({ title: '提示', message: '請填寫基本資訊或選擇分類' });
       return;
    }

    setIsSyncing(true);
    try {
       const finalTags = tags.filter(t => addTagIds.includes(t.id)).map(t => t.name);
       const categoryName = dbCategories.find(c => c.code === addCatId)?.zh || '';
       const manufacturerName = manufacturers.find(m => m.id === addSubId)?.name || '';

       if (editPhotoId) {
          const original = photos.find(p => p.id === editPhotoId);
          if (!original) throw new Error('Photo not found');

          const updatedPhoto: Photo = {
            ...original,
            name: addName || original.name,
            categoryId: addCatId,
            subcategoryId: addSubId,
            tagIds: addTagIds,
            category: categoryName || original.category,
            sub_category: manufacturerName || original.sub_category,
            tags: finalTags,
            description: addNote,
            manual_code: addManualCode,
            dimensions: {
              length: parseFloat(addDimL) || 0,
              width: parseFloat(addDimW) || 0,
              height: parseFloat(addDimH) || 0,
              unit: 'cm'
            },
            updatedAt: new Date().toISOString()
          };

          setPhotos(prev => (prev as Photo[]).map(p => p.id === editPhotoId ? updatedPhoto : p));
          
          /* 
          Removing automatic cloud sync on every save to favor manual control as requested.
          if (user) {
             await savePhotoToCloud(user.id, updatedPhoto);
          }
          */
       } else if (newPhotoData) {
          // Creating a new photo item from base64 data
          const dbId = crypto.randomUUID();
          const newPhoto: Photo = {
            id: dbId,
            storageId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            item_code: generateItemCode(),
            manual_code: addManualCode,
            image_hash: calculateMD5(newPhotoData),
            name: addName || '未命名家具',
            category: categoryName || '未分類',
            sub_category: manufacturerName,
            tags: finalTags,
            description: addNote,
            image_url: '',
            uri: newPhotoData,
            categoryId: addCatId,
            subcategoryId: addSubId,
            tagIds: addTagIds,
            dimensions: {
              length: parseFloat(addDimL) || 0,
              width: parseFloat(addDimW) || 0,
              height: parseFloat(addDimH) || 0,
              unit: 'cm'
            },
            createdAt: new Date().toISOString(),
            groupId: null
          };

          setPhotos(prev => [newPhoto, ...(prev as Photo[])]);
          
          /* 
          Removing automatic cloud sync on every save to favor manual control as requested.
          if (user) {
            await savePhotoToCloud(user.id, newPhoto);
          }
          */
       }
       
       resetAddState();
       setActiveScreen('home');
    } catch (err: any) {
       setAlertDialog({ title: '儲存失敗', message: err.message });
    } finally {
       setIsSyncing(false);
    }
  };

  const saveBatchEdit = async () => {
     if (!batchEditIds) return;
     setIsSyncing(true);
     try {
        const finalTags = tags.filter(t => addTagIds.includes(t.id)).map(t => t.name);
        const categoryName = dbCategories.find(c => c.code === addCatId)?.zh || '';
        const manufacturerName = manufacturers.find(m => m.id === addSubId)?.name || '';

        const updatedPhotos = photos.map(p => {
          if (batchEditIds.includes(p.id)) {
             return {
               ...p,
               categoryId: addCatId || p.categoryId,
               subcategoryId: addSubId || p.subcategoryId,
               tagIds: addTagIds.length > 0 ? addTagIds : p.tagIds,
               category: categoryName || p.category,
               sub_category: manufacturerName || p.sub_category,
               tags: finalTags.length > 0 ? finalTags : p.tags,
               description: addNote || p.description,
               manual_code: addManualCode || p.manual_code,
               updatedAt: new Date().toISOString()
             };
          }
          return p;
        });

        setPhotos(updatedPhotos);
        
        /* 
        Removing automatic cloud sync on every save to favor manual control as requested.
        if (user) {
           for (const id of batchEditIds) {
              const photo = updatedPhotos.find(p => p.id === id);
              if (photo) await savePhotoToCloud(user.id, photo);
           }
        }
        */
        
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
    addCatId, setAddCatId,
    addSubId, setAddSubId,
    addTagIds, setAddTagIds,
    addNote, setAddNote,
    addName, setAddName,
    addManualCode, setAddManualCode,
    addDimL, setAddDimL,
    addDimW, setAddDimW,
    addDimH, setAddDimH,
    showOtherFields, setShowOtherFields,
    resetAddState,
    saveNewPhoto,
    saveBatchEdit
  };
};
