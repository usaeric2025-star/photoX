import React, { useState, useRef, useEffect } from 'react';
import { Photo, Category, Tag, DB_Category, SubCategory } from '../types';
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
  dbCategories: DB_Category[],
  manufacturers: any[],
  setManufacturers: React.Dispatch<React.SetStateAction<any[]>>,
  setAlertDialog: (dialog: { title: string, message: string } | null) => void,
  setIsSyncing: (syncing: boolean) => void
) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [cloudCount, setCloudCount] = useState<number | null>(null);
  
  const photosRef = useRef(photos);
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [aiDebugInfo, setAiDebugInfo] = useState<{ step: string; message: string; error?: string } | null>(null);
  const currentAnalysisController = useRef<AbortController | null>(null);

  const abortAnalysis = () => {
    if (currentAnalysisController.current) {
      currentAnalysisController.current.abort();
      currentAnalysisController.current = null;
      setAiDebugInfo({ step: '已取消', message: '用戶中斷了 AI 識別任务' });
      setTimeout(() => setAiDebugInfo(null), 3000);
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    photosRef.current = photos;
    if (!isInitializing) {
      console.log("DEBUG: Saving to IndexedDB, photo count:", photos.length);
      saveData('product_photos', photos);
    }
  }, [photos, isInitializing]);
  
  useEffect(() => {
    const initPhotos = async () => {
      // 優先載入本地 IndexedDB 照片
      try {
        let localPhotos = await loadData('product_photos');
        if (!localPhotos || localPhotos.length === 0) {
           // Try migrate from old key
           const oldPhotos = await loadData('photos');
           if (oldPhotos && oldPhotos.length > 0) {
              localPhotos = oldPhotos;
              await saveData('product_photos', oldPhotos);
           }
        }
        
        if (localPhotos && localPhotos.length > 0) {
          setPhotos(localPhotos.map((p: any) => ({ ...p, isAnalyzing: false })));
        }
        
        if (user) {
          // Always try to pull cloud photos to stay up-to-date
          loadAllPhotosFromCloud()
            .then(cloudPhotos => {
              if (cloudPhotos && cloudPhotos.length > 0) {
                setPhotos(prevPhotos => {
                  const newMap = new Map();
                  // Load existing local photos first
                  prevPhotos.forEach(p => newMap.set(p.id, p));
                  
                  // Merge with cloud photos
                  cloudPhotos.forEach(cp => {
                     const lp = newMap.get(cp.id);
                     // If no local, or cloud is newer, take cloud.
                     if (!lp || (cp.updatedAt && lp.updatedAt && new Date(cp.updatedAt) > new Date(lp.updatedAt))) {
                       newMap.set(cp.id, cp);
                     }
                  });
                  return Array.from(newMap.values());
                });
                // After merging, save to IndexedDB
                saveData('product_photos', Array.from(new Map( (localPhotos || []).concat(cloudPhotos).map(p => [p.id, p]) ).values()));
              }
            })
            .catch(e => console.error('Cloud pull during init failed:', e));
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
    const unProcessed = photos.filter(p => {
       const rawTagIds = Array.isArray(p.tagIds) ? p.tagIds : (typeof p.tagIds === 'string' ? [p.tagIds] : []);
       return (!p.categoryId || !p.subcategoryId || rawTagIds.length < 2 || !p.name) && !p.isAnalyzing;
    });
    
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
          const result = await analyzeProductPhoto(photo.uri!, dbCategories, tags, manufacturers, effectiveKey, aiProvider, customModel, photo.categoryId || null);
          
          let finalCatId = result.categoryId || null;
          let finalSubId = result.subcategoryId || null;
          let finalTagIds = result.tagIds || [];
          
          if (result.newSubCategoryName && !result.subcategoryId) {
             const newMfrId = crypto.randomUUID();
             const newMfr = { id: newMfrId, name: result.newSubCategoryName, aliases: [] };
             setManufacturers(prev => [...prev, newMfr]);
             finalSubId = newMfrId;
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

          setPhotos(prev => {
            const next = prev.map(p => {
              if (p.id !== photo.id) return p;

              const safeOldTagIds = Array.isArray(p.tagIds) ? p.tagIds : (typeof p.tagIds === 'string' ? [p.tagIds] : []);
              const mergedTagIds = Array.from(new Set([...safeOldTagIds, ...finalTagIds]));

              const dbCatObj = dbCategories.find(c => c.code === finalCatId);

              // Use newCategoryName directly as category if no code matches
              const updatedPhoto: Photo = { 
                ...p, 
                categoryId: p.categoryId && p.categoryId !== 'uncategorized' ? p.categoryId : finalCatId, 
                subcategoryId: p.subcategoryId || finalSubId, 
                tagIds: mergedTagIds,
                name: p.name && p.name !== 'Furniture' ? p.name : (result.name || null),
                category: p.category && p.category !== 'Uncategorized' ? p.category : (dbCatObj?.zh || result.newCategoryName || null),
                sub_category: p.sub_category || manufacturers.find(m => m.id === finalSubId)?.name || result.newSubCategoryName || null,
                tags: tags.filter(t => mergedTagIds.includes(t.id)).map(t => t.name),
                dimensions: p.dimensions || result.dimensions || null,
                isAnalyzing: false 
              };

              // Backup to cloud immediately
              if (user) {
                savePhotoToCloud(user.id, updatedPhoto).catch(e => console.error("Batch backup failed for photo:", p.id, e));
              }

              return updatedPhoto;
            });
            photosRef.current = next;
            return next;
          });
          successCount++;
        } catch (err: any) {
          setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, isAnalyzing: false } : p));
          const errMsg = err.message || '未知錯誤';
          if (errMsg.includes('權限') || errMsg.includes('Failed to fetch') || errMsg.includes('401') || errMsg.includes('403')) {
            setAlertDialog({ title: '识别失败', message: `AI 识别失败，可能金鑰無效或網路錯誤。\n\n照片 ID: ${photo.id}\n错误原因: ${errMsg}\n\n已終止後續任務。` });
            break;
          } else {
            console.error("Skipping photo due to error:", errMsg);
            continue;
          }
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

  const handleSingleAiAnalyze = async (imageData: string | null, catId?: string, editPhotoId?: string | null) => {
    if (!imageData) return;
    setIsAnalyzing(true);
    setAiDebugInfo({ step: '准备中', message: '正在初始化...' });
    
    const controller = new AbortController();
    currentAnalysisController.current = controller;
    const signal = controller.signal;
    
    try {
      const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;
      setAiDebugInfo({ step: '检查金钥', message: `Key 读取: ${apiKey ? apiKey.substring(0, 5) + '...' : '空'}` });
      if (!apiKey) throw new Error('API Key 为空');

      setAiDebugInfo({ step: '发送请求', message: `图片大小: ${imageData.length} bytes, Provider: ${aiProvider}` });
      
      const result = await analyzeProductPhoto(imageData, dbCategories, tags, manufacturers, geminiApiKey, aiProvider, customModel, catId, signal);
      
      if (signal.aborted) throw new Error('Aborted');

      setAiDebugInfo({ step: '完成', message: 'AI 识别成功' });
      setTimeout(() => {
        if (currentAnalysisController.current === controller) {
          setAiDebugInfo(null);
          currentAnalysisController.current = null;
        }
      }, 3000);

      // Same manufacturer/tag ID creation logic as batch if new ones are suggested
      if (result.newSubCategoryName && !result.subcategoryId) {
        const newMfrId = crypto.randomUUID();
        setManufacturers(prev => [...prev, { id: newMfrId, name: result.newSubCategoryName, aliases: [] }]);
        result.subcategoryId = newMfrId;
      }
      
      let finalTagIdsFromAi = result.tagIds || [];
      if (result.newTagName) {
        const newNames = result.newTagName.split(',').map((s: string) => s.trim()).filter(Boolean);
        const newTagsToAdd: Tag[] = [];
        const newTagIds: string[] = [];
        
        newNames.forEach((name: string) => {
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
        finalTagIdsFromAi = Array.from(new Set([...finalTagIdsFromAi, ...newTagIds]));
      }

      if (editPhotoId) {
        setPhotos(prev => prev.map(p => {
          if (p.id !== editPhotoId) return p;
          
          let finalCatId = result.categoryId || p.categoryId;
          let finalSubId = result.subcategoryId || p.subcategoryId;
          
          const safeOldTagIds = Array.isArray(p.tagIds) ? p.tagIds : (typeof p.tagIds === 'string' ? [p.tagIds] : []);
          const mergedTagIds = Array.from(new Set([...safeOldTagIds, ...finalTagIdsFromAi]));

          const dbCatObj = dbCategories.find(c => c.code === finalCatId);

          const updatedPhoto = { 
            ...p, 
            categoryId: finalCatId,
            subcategoryId: finalSubId,
            tagIds: mergedTagIds,
            name: p.name || result.name || null,
            category: p.category || dbCatObj?.zh || result.newCategoryName || null,
            sub_category: p.sub_category || manufacturers.find(m => m.id === finalSubId)?.name || result.newSubCategoryName || null,
            tags: tags.filter(t => mergedTagIds.includes(t.id)).map(t => t.name),
            dimensions: p.dimensions || result.dimensions || null,
            isAnalyzing: false 
          };
          
          if (user) {
            savePhotoToCloud(user.id, updatedPhoto).catch(e => console.error("Immediate backup failed:", e));
          }
          
          return updatedPhoto;
        }));
      }
      // Populate form state properties to return them
      result.tagIds = finalTagIdsFromAi;
      return result;
    } catch (err: any) {
      console.error("Single AI analysis failed:", err);
      setAiDebugInfo({ step: '错误', message: '识别失败', error: err.message });
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
    setIsSyncing(true); // Global loading overlay
    setImportTotal(fileArray.length);
    setImportProgress(0);
    setActiveScreen('home');

    const sessionHashes = new Set<string>();
    let successCount = 0;
    let duplicateCount = 0;
    let failCount = 0;

    const CHUNK_SIZE = 1; // Drop to 1 to save memory on mobile mapping
    let processed = 0;
    for (let i = 0; i < fileArray.length; i += CHUNK_SIZE) {
      const chunk = fileArray.slice(i, i + CHUNK_SIZE);
      const newPhotosDraft: Photo[] = [];
      
      for (const file of chunk) {
        processed++;
        setImportProgress(processed);
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

          // 2. Check local duplicates (session and existing)
          const duplicate = photosRef.current.find(p => p.image_hash === hash);
          if (duplicate || sessionHashes.has(hash)) {
            duplicateCount++;
            continue;
          }

          // Note: Cloud duplicate check removed from import stage to improve performance and prevent rate limiting.
          // It will be handled during the syncPush stage instead.

          // 4. Processing
          const rawUri = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target?.result as string);
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsDataURL(file);
          });
          
          if (!rawUri) continue;
          
          const compressedUri = await compressImage(rawUri, 1200, 0.8);
          sessionHashes.add(hash);

          // 5. Use crypto.randomUUID() for both photo ID and naming storage
          const photoId = crypto.randomUUID();
          
          const newPhoto: Photo = {
            id: photoId,
            storageId: photoId,
            item_code: generateItemCode(),
            manual_code: '',
            image_hash: hash,
            name: file.name.split('.')[0] || '未命名产品',
            category: '未分类',
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
          successCount++;
          
          if (useAi) {
            (async (targetPhoto: Photo) => {
              try {
                const result = await analyzeProductPhoto(targetPhoto.uri!, dbCategories, tags, manufacturers, geminiApiKey, aiProvider, customModel);
                
                let finalCatId = result.categoryId || null;
                let finalSubId = result.subcategoryId || null;
                
                // For simplicity in background processing, new tags/categories are skipped here if they lack IDs
                // Or we can just populate the text directly.

                const dbCatObj = dbCategories.find(c => c.code === finalCatId);

                setPhotos(prev => prev.map(p => {
                   if (p.id !== photoId) return p;
                   const updatedPhoto = {
                     ...p,
                     isAnalyzing: false,
                     name: result.name || p.name,
                     categoryId: finalCatId,
                     subcategoryId: finalSubId,
                     tagIds: result.tagIds || [],
                     category: dbCatObj?.zh || result.newCategoryName || '未分类',
                     sub_category: manufacturers.find(m => m.id === finalSubId)?.name || result.newSubCategoryName || '',
                     dimensions: result.dimensions || p.dimensions
                   };
                   
                   if (user) {
                     savePhotoToCloud(user.id, updatedPhoto).catch(e => console.error("Process queue backup failed:", e));
                   }
                   
                   return updatedPhoto;
                }));
              } catch (err: any) {
                setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, isAnalyzing: false } : p));
              }
            })(newPhoto);
          }
        } catch (err: any) {
          console.error("Import processing error", err);
          failCount++;
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
    
    setIsSyncing(false);
    setIsImporting(false);
    
    if (successCount > 0 || duplicateCount > 0 || failCount > 0) {
       let msg = `成功處理了 ${successCount} 張照片。`;
       if (duplicateCount > 0) msg += `\n跳過了 ${duplicateCount} 張重複照片。`;
       if (failCount > 0) msg += `\n有 ${failCount} 張失敗。`;
       
       setAlertDialog({ 
         title: '上傳完成', 
         message: msg
       });
    }
  };
  
  const deletePhoto = async (idOrIds: string | string[]) => {
      const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
      const photosToDelete = photosRef.current.filter(p => ids.includes(p.id));
      
      // 1. Immediately update UI
      const newPhotos = photosRef.current.filter(p => !ids.includes(p.id));
      setPhotos(newPhotos);
      saveData('product_photos', newPhotos);
      
      // 2. Immediately delete from Cloud
      if (user) {
        try {
          await Promise.all(photosToDelete.map(photo => deletePhotoFromCloud(user.id, photo)));
        } catch (err) {
          console.error("Cloud deletion failed:", err);
          // Optional: Revert UI or alert user?
        }
      }
  };

  const updatePhoto = async (updatedPhoto: Photo) => {
    // 1. Immediately update UI
    setPhotos(prev => prev.map(p => p.id === updatedPhoto.id ? updatedPhoto : p));
    saveData('product_photos', photosRef.current.filter(p => p.id !== updatedPhoto.id).concat(updatedPhoto));
    
    // 2. Immediately update cloud
    if (user) {
       await savePhotoToCloud(user.id, updatedPhoto);
    }
  };

  return {
    photos, setPhotos,
    isAnalyzing, setIsAnalyzing, isBatchAnalyzing, isImporting, importProgress, importTotal, batchProgress,
    aiDebugInfo, abortAnalysis,
    cloudCount, setCloudCount,
    handleSingleAiAnalyze,
    handleBatchAiIdentify, handlePhotoImport, deletePhoto, updatePhoto
  };
};
