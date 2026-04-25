import React, { useState, useRef, useEffect } from 'react';
import { Photo, Category, Tag } from '../types';
import { 
  savePhotoToCloud, 
  deletePhotoFromCloud, 
  compressImage, 
  calculateMD5,
  calculateMD5FromArrayBuffer,
  generateItemCode,
  checkImageHashExists,
  loadAllPhotosFromCloud
} from '../services/supabaseService';
import { analyzeProductPhoto } from '../services/geminiService';
import { loadData } from '../utils/indexedDB';

export const useAdminPhotos = (
  user: any, 
  geminiApiKey: string, 
  aiProvider: string, 
  customModel: string,
  categories: Category[],
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>,
  tags: Tag[],
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>,
  setAlertDialog: (dialog: { title: string, message: string } | null) => void,
  setIsSyncing: (syncing: boolean) => void
) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [cloudCount, setCloudCount] = useState<number | null>(null);
  
  const photosRef = useRef(photos);
  
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  
  useEffect(() => {
    const initPhotos = async () => {
      // 優先載入本地 IndexedDB 照片
      const localPhotos = await loadData('photos');
      if (localPhotos && localPhotos.length > 0) {
        setPhotos(localPhotos);
      }
      
      if (user || sessionStorage.getItem('isStaffMode') === 'true') {
        // 從雲端讀取照片並與本地合併
        try {
          const cloudPhotos = await loadAllPhotosFromCloud();
          setPhotos(prev => {
            const merged = [...prev];
            cloudPhotos.forEach(cp => {
              if (!merged.find(p => p.id === cp.id)) {
                merged.push(cp);
              }
            });
            return merged;
          });
        } catch (e) {
          console.error(e);
        }
      }
    };
    initPhotos();
  }, [user]);

  const handleBatchAiIdentify = async (
      photos: Photo[], 
      dbCategories: any[], 
      cancelBatchAiRef: React.MutableRefObject<boolean>
  ) => {
    const effectiveKey = geminiApiKey || process.env.GEMINI_API_KEY;
    const unProcessed = photos.filter(p => (!p.categoryId || !p.tagIds || p.tagIds.length === 0) && !p.isAnalyzing);
    
    if (unProcessed.length === 0) {
      setAlertDialog({ title: '提示', message: '所有照片都已經有分類和標籤了，無需重複識別。' });
      return;
    }
    
    if (!effectiveKey) {
      setAlertDialog({ title: '提示', message: '請先在設定中設定 AI 金鑰' });
      return;
    }

    setBatchProgress({ current: 0, total: unProcessed.length });
    setIsBatchAnalyzing(true);
    cancelBatchAiRef.current = false;
    let successCount = 0;

    try {
      for (let i = 0; i < unProcessed.length; i++) {
        if (cancelBatchAiRef.current) break;
        
        const photo = unProcessed[i];
        setBatchProgress(prev => ({ ...prev, current: i + 1 }));
        
        setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, isAnalyzing: true } : p));
        
        try {
          const result = await analyzeProductPhoto(photo.uri!, categories, tags, effectiveKey, aiProvider, customModel);
          
          let finalCatId = result.categoryId || null;
          let finalSubId = result.subcategoryId || null;
          let finalTagIds = result.tagIds || [];
          
          if (result.newCategoryName && !result.categoryId) {
            const newCat = { id: crypto.randomUUID(), name: result.newCategoryName, aliases: [], subcategories: [] };
            setCategories(prev => [...prev, newCat]);
            finalCatId = newCat.id;
          } else if (result.newSubCategoryName && !result.subcategoryId && finalCatId) {
             const newSubId = crypto.randomUUID();
             setCategories(prev => prev.map(c => c.id === finalCatId ? {
               ...c, subcategories: [...c.subcategories, { id: newSubId, name: result.newSubCategoryName, aliases: []}]
             } : c));
             finalSubId = newSubId;
          }
          
          if (result.newTagName) {
            const newNames = result.newTagName.split(',').map((s: string) => s.trim()).filter(Boolean);
            const newTagsToAdd: Tag[] = [];
            const newTagIds: string[] = [];
            
            newNames.forEach((name: string) => {
              const id = crypto.randomUUID();
              newTagsToAdd.push({ id, name, aliases: [] });
              newTagIds.push(id);
            });
            
            if (newTagsToAdd.length > 0) {
              setTags(prev => [...prev, ...newTagsToAdd]);
              finalTagIds = Array.from(new Set([...finalTagIds, ...newTagIds]));
            }
          }

          setPhotos(prev => prev.map(p => p.id === photo.id ? { 
            ...p, 
            categoryId: finalCatId, 
            subcategoryId: finalSubId, 
            tagIds: finalTagIds,
            name: result.name || p.name,
            category: categories.find(c => c.id === finalCatId)?.name || result.newCategoryName || p.category,
            sub_category: categories.find(c => c.id === finalCatId)?.subcategories.find(s => s.id === finalSubId)?.name || result.newSubCategoryName || p.sub_category,
            tags: tags.filter(t => finalTagIds.includes(t.id)).map(t => t.name),
            dimensions: result.dimensions || p.dimensions,
            isAnalyzing: false 
          } : p));
          successCount++;
        } catch (err: any) {
          setAlertDialog({ title: '识别失败', message: `AI 识别失败。\n\n照片 ID: ${photo.id}\n错误原因: ${err.message || '未知错误'}` });
          setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, isAnalyzing: false } : p));
          break;
        }
      }
      if (successCount > 0) {
        setAlertDialog({ title: '处理完成', message: `处理终止或完成！成功识别了 ${successCount} 张照片。` });
      }
    } finally {
      setIsBatchAnalyzing(false);
      setBatchProgress({ current: 0, total: 0 });
    }
  };

  const handlePhotoImport = async (
    e: React.ChangeEvent<HTMLInputElement>,
    useAi: boolean,
    setActiveScreen: (s: any) => void
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files) as File[];
    
    setIsImporting(true);
    setActiveScreen('home');

    const sessionHashes = new Set<string>();

    const CHUNK_SIZE = 3;
    for (let i = 0; i < fileArray.length; i += CHUNK_SIZE) {
      const chunk = fileArray.slice(i, i + CHUNK_SIZE);
      const newPhotosDraft: Photo[] = [];
      
      for (const file of chunk) {
        try {
          const rawUri = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target?.result as string);
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsDataURL(file);
          });
          
          if (!rawUri) continue;

          const arrayBuffer = await file.arrayBuffer();
          const rawHash = calculateMD5FromArrayBuffer(arrayBuffer);
          
          if (photosRef.current.some(p => p.image_hash === rawHash) || sessionHashes.has(rawHash)) continue;
          
          const compressedUri = await compressImage(rawUri);
          const imgHash = calculateMD5(compressedUri);

          if (photosRef.current.some(p => p.image_hash === imgHash) || sessionHashes.has(imgHash)) continue;
          
          if (user) {
            const existingInfo = await checkImageHashExists(imgHash);
            if (existingInfo) {
              setAlertDialog({ 
                title: '图片重复', 
                message: `照片「${file.name}」在云端已存在相同内容`
              });
              continue;
            }
          }

          sessionHashes.add(rawHash);
          sessionHashes.add(imgHash);

          const dbId = crypto.randomUUID();
          
          const newPhoto: Photo = {
            id: dbId,
            storageId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            item_code: generateItemCode(),
            manual_code: '',
            image_hash: imgHash,
            name: file.name.split('.')[0] || '未命名家具',
            category: '未分類',
            sub_category: '',
            tags: [],
            description: '',
            image_url: '',
            uri: compressedUri,
            categoryId: null,
            subcategoryId: null,
            tagIds: [],
            createdAt: new Date().toISOString(),
            groupId: null,
            isAnalyzing: !!useAi
          };
          
          newPhotosDraft.push(newPhoto);
          
          if (useAi) {
            (async (targetPhoto: Photo) => {
              try {
                const result = await analyzeProductPhoto(targetPhoto.uri!, categories, tags, geminiApiKey, aiProvider, customModel);
                setPhotos(prev => prev.map(p => p.id === dbId ? { ...p, isAnalyzing: false, ...result } : p));
              } catch (err: any) {
                setPhotos(prev => prev.map(p => p.id === dbId ? { ...p, isAnalyzing: false } : p));
              }
            })(newPhoto);
          }
        } catch (err: any) {
          console.error("Import processing error", err);
        }
      }
      
      if (newPhotosDraft.length > 0) {
        setPhotos(prev => {
          const next = [...newPhotosDraft, ...prev];
          photosRef.current = next;
          return next;
        });
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    setIsImporting(false);
  };
  
  const deletePhoto = async (id: string, photo: Photo) => {
      setPhotos(prev => prev.filter(p => p.id !== id));
      if (user && photo) {
        try {
          await deletePhotoFromCloud(user.id, photo);
        } catch (err) {
          console.error("Cloud deletion failed:", err);
        }
      }
  };

  return {
    photos, setPhotos,
    isAnalyzing, isBatchAnalyzing, isImporting, batchProgress,
    cloudCount, setCloudCount,
    handleBatchAiIdentify, handlePhotoImport, deletePhoto
  };
};
