import React, { useState, useRef, useEffect } from 'react';
import { Photo, Category, Tag } from '../types';
import { 
  savePhotoToCloud, 
  deletePhotoFromCloud, 
  compressImage, 
  calculateMD5,
  calculateMD5FromFile,
  calculateMD5FromArrayBuffer,
  generateItemCode,
  checkImageHashExists,
  loadAllPhotosFromCloud
} from '../services/supabaseService';
import { analyzeProductPhoto } from '../services/geminiService';
import { loadData, saveData } from '../utils/indexedDB';

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
  
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    photosRef.current = photos;
    if (!isInitializing) {
      saveData('photos', photos);
    }
  }, [photos, isInitializing]);
  
  useEffect(() => {
    const initPhotos = async () => {
      // 優先載入本地 IndexedDB 照片
      try {
        const localPhotos = await loadData('photos');
        if (localPhotos && localPhotos.length > 0) {
          setPhotos(localPhotos);
        } else if (user) {
          // Only if local is empty and user is logged in, attempt a first-time pull
          const cloudPhotos = await loadAllPhotosFromCloud();
          if (cloudPhotos && cloudPhotos.length > 0) {
            setPhotos(cloudPhotos);
          }
        }
      } catch (e) {
        console.error('Init photos failed:', e);
      } finally {
        setIsInitializing(false);
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
    const unProcessed = photos.filter(p => (!p.categoryId || !p.subcategoryId || !p.tagIds || p.tagIds.length < 2 || !p.name) && !p.isAnalyzing);
    
    if (unProcessed.length === 0) {
      setAlertDialog({ title: '提示', message: '所有照片都已經具備名稱、分類和 2 個標籤了，無需重複識別。' });
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
        
        let photo = unProcessed[i];
        setBatchProgress(prev => ({ ...prev, current: i + 1 }));
        
        // --- Duplicate check logic ---
        if (photo.uri && !photo.image_hash) {
          const hash = calculateMD5(photo.uri);
          photo.image_hash = hash;
          setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, image_hash: hash } : p));
        }

        if (photo.image_hash) {
          const dupInLocal = photosRef.current.find(p => p.id !== photo.id && p.image_hash === photo.image_hash);
          if (dupInLocal) {
            console.log(`Removing duplicate ${photo.id} in favor of ${dupInLocal.id}`);
            await deletePhoto(photo.id);
            continue; // Skip AI for deleted duplicate
          }

          if (user) {
            const dupInCloud = await checkImageHashExists(photo.image_hash);
            // If in cloud and NOT this record (id check), then it's a duplicate
            // However, cloud check doesn't return ID often.
            // If we found something with DIFFERENT code/id in cloud, we might consider it duplicate.
            // For now, let's stick to local duplicates during batch to avoid too many DB queries.
          }
        }
        // ------------------------------

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
              // Check if tag with same name already exists in current tags
              const existingTag = tags.find(t => t.name.toLowerCase() === name.toLowerCase());
              if (existingTag) {
                newTagIds.push(existingTag.id);
              } else {
                const id = crypto.randomUUID();
                newTagsToAdd.push({ id, name, aliases: [] });
                newTagIds.push(id);
              }
            });
            
            if (newTagsToAdd.length > 0) {
              setTags(prev => {
                const filtered = newTagsToAdd.filter(nt => !prev.some(p => p.name.toLowerCase() === nt.name.toLowerCase()));
                return [...prev, ...filtered];
              });
            }
            finalTagIds = Array.from(new Set([...finalTagIds, ...newTagIds]));
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

  const handleSingleAiAnalyze = async (imageData: string | null, catId?: string) => {
    if (!imageData) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeProductPhoto(imageData, categories, tags, geminiApiKey, aiProvider, customModel, catId);
      return result;
    } catch (err: any) {
      console.error("Single AI analysis failed:", err);
      setAlertDialog({ title: 'AI 识别失败', message: err.message || '识别过程出现问题' });
    } finally {
      setIsAnalyzing(false);
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
          // 1. Calculate MD5 from file directly as requested
          const hash = await (async () => {
            try {
              return await calculateMD5FromFile(file);
            } catch (e) {
              const arrayBuffer = await file.arrayBuffer();
              return calculateMD5FromArrayBuffer(arrayBuffer);
            }
          })();

          // 2. Check local duplicates
          const duplicate = photosRef.current.find(p => p.image_hash === hash);
          if (duplicate || sessionHashes.has(hash)) {
            setAlertDialog({ 
              title: '照片已存在', 
              message: `照片「${file.name}」已经存在本地库中${duplicate ? ` (名称: ${duplicate.name})` : ''}` 
            });
            continue;
          }

          // 3. Check cloud duplicates if logged in
          if (user) {
            const existingInfo = await checkImageHashExists(hash);
            if (existingInfo) {
              setAlertDialog({ 
                title: '云端已存在', 
                message: `照片「${file.name}」在云端数据库中已存在，将跳过重复上传。`
              });
              continue;
            }
          }

          // 4. Processing
          const rawUri = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target?.result as string);
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsDataURL(file);
          });
          
          if (!rawUri) continue;
          
          const compressedUri = await compressImage(rawUri);
          sessionHashes.add(hash);

          // 5. Use crypto.randomUUID() for both photo ID and naming storage
          const photoId = crypto.randomUUID();
          
          const newPhoto: Photo = {
            id: photoId,
            storageId: photoId, // Use UUID for storage path as requested
            item_code: generateItemCode(),
            manual_code: '',
            image_hash: hash,
            name: file.name.split('.')[0] || 'Furniture', // Keep original name
            category: 'Uncategorized',
            sub_category: '',
            tags: [],
            description: '',
            image_url: '',
            uri: compressedUri,
            categoryId: 'uncategorized',
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
                setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, isAnalyzing: false, ...result } : p));
              } catch (err: any) {
                setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, isAnalyzing: false } : p));
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
  
  const deletePhoto = async (idOrIds: string | string[]) => {
      const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
      const photosToDelete = photosRef.current.filter(p => ids.includes(p.id));
      
      setPhotos(prev => prev.filter(p => !ids.includes(p.id)));
      
      if (user) {
        try {
          for (const photo of photosToDelete) {
             await deletePhotoFromCloud(user.id, photo);
          }
        } catch (err) {
          console.error("Cloud deletion failed:", err);
        }
      }
  };

  return {
    photos, setPhotos,
    isAnalyzing, setIsAnalyzing, isBatchAnalyzing, isImporting, batchProgress,
    cloudCount, setCloudCount,
    handleSingleAiAnalyze,
    handleBatchAiIdentify, handlePhotoImport, deletePhoto
  };
};
