import React, { useState, useRef, useEffect } from 'react';
import { Photo, Category, Tag, SubCategory } from '../types';
import { 
  savePhotoToCloud, 
  deletePhotoFromCloud, 
  compressImage,
  calculateMD5,
  calculateMD5FromFile,
  calculateMD5FromArrayBuffer,
  generateItemCode,
  checkImageHashExists,
  loadAllPhotosFromCloud,
  loadPhotosFromCloud,
  batchCreateTags,
  syncPhotosToCloud
} from '../services/supabaseService';
import { resolveTagIdsBatch } from '../utils/tagUtils';
import { analyzeProductPhoto } from '../services/geminiService';
import { loadData, saveData } from '../utils/indexedDB';
import { useGalleryContext } from '../context/GalleryContext';
import { IMAGE_COMPRESS, AI_CONFIG } from '../constants/config';
import { useOptionalAdminSession, useOptionalAdminUI } from '../context/AdminContexts';

const shouldUpdateName = (name: string | null | undefined): boolean => {
  if (!name) return true;
  const lower = name.toLowerCase();
  return (
    lower === 'furniture' ||
    lower === '未命名产品' ||
    lower === 'furniture record' ||
    /^[\d\s\-_]+$/.test(name) ||
    /\.(jpg|jpeg|png|heic|webp)$/i.test(name) ||
    /^(img|image|photo|dsc|pic)[\s_-]?\d+/i.test(lower) ||
    name.length < 3
  );
};

export const useAdminPhotos = (
  user: any, 
  geminiApiKey: string, 
  aiProvider: string, 
  customModel: string,
  adminUI?: any,
  adminSession?: any,
  addManufacturer?: (name: string) => Promise<any>
) => {
  const {
    photos, setPhotos,
    categories, setCategories,
    tags, setTags, tagNameToIdMap, tagIdToNameMap,
    manufacturers, setManufacturers
  } = useGalleryContext();

  const { setIsSyncing = () => {} } = adminSession || {};
  const { setAlertDialog = () => {}, setActiveScreen = () => {}, setLoadingState = () => {} } = adminUI || {};
  
  const [internalCloudCount, setInternalCloudCount] = useState<number | null>(null);
  const cloudCount = adminUI?.cloudCount ?? internalCloudCount;
  const setCloudCount = adminUI?.setCloudCount || setInternalCloudCount;

  const [internalLoadingState, setInternalLoadingState] = useState<'idle' | 'syncing' | 'analyzing' | 'importing'>('idle');
  const actualSetLoadingState = setLoadingState || setInternalLoadingState;
  const loadingState = setLoadingState ? undefined : internalLoadingState;

  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  
  const photosRef = useRef(photos);
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [aiDebugInfo, setAiDebugInfo] = useState<{ step: string; message: string; error?: string } | null>(null);
  const currentAnalysisController = useRef<AbortController | null>(null);

  const abortAnalysis = () => {
    if (currentAnalysisController.current) {
      currentAnalysisController.current.abort();
      currentAnalysisController.current = null;
      setAiDebugInfo({ step: '已取消', message: '用戶中斷了 AI 識別任务' });
      
      // Stop the UI loading state
      actualSetLoadingState('idle');
      
      setTimeout(() => setAiDebugInfo(null), 3000);
    }
  };

  useEffect(() => {
    photosRef.current = photos;
    if (!isInitializing) {
      saveData('product_photos', photos);
    }
  }, [photos, isInitializing]);
  
  useEffect(() => {
    const initPhotos = async () => {
      setIsInitializing(true);
      try {
        if (user) {
          // ALWAYS fetch from cloud on init, as per requirement
          const cloudPhotos = await loadPhotosFromCloud(user.id);
          if (cloudPhotos) {
            setPhotos(cloudPhotos);
            setCloudCount(cloudPhotos.length);
            // Overwrite local indexedDB
            await saveData('product_photos', cloudPhotos);
          } else {
             // Fallback/sync from local if cloud failed or empty?
             // User requested overwriting by cloud, if cloud is empty, local becomes empty.
             // This might be harsh if cloud is empty due to temporary issue, 
             // but it follows "Synchronize from cloud", "OverwriteIndexedDB".
             setPhotos([]);
             await saveData('product_photos', []);
          }
        } else {
          // Fallback local if user is not logged in
          const localPhotos = await loadData('product_photos');
          setPhotos(localPhotos || []);
        }
      } catch (e) {
        console.error('Init photos failed:', e);
         // Fallback local if cloud fails
         const localPhotos = await loadData('product_photos');
         setPhotos(localPhotos || []);
      } finally {
        setIsInitializing(false);
      }
    };
    initPhotos();
  }, [user]);

  const handleBatchAiIdentify = async (
      photos: Photo[], 
      isCancelled: () => boolean
  ) => {
    const effectiveKey = geminiApiKey || process.env.GEMINI_API_KEY;
    const unProcessed = photos.filter(p => {
       const rawTagIds = Array.isArray(p.tagIds) ? p.tagIds : (typeof p.tagIds === 'string' ? [p.tagIds] : []);
       return (!p.categoryId || rawTagIds.length < 2 || !p.name) && !p.isAnalyzing;
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
    actualSetLoadingState('analyzing');
    
    const CONCURRENCY = AI_CONFIG.CONCURRENCY;
    let completedCount = 0;
    
    const processPhoto = async (photo: Photo): Promise<void> => {
        // --- Duplicate check logic ---
        if (photo.uri && !photo.image_hash) {
            const hash = calculateMD5(photo.uri);
            photo.image_hash = hash;
            setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, image_hash: hash } : p));
        }

        if (photo.image_hash) {
            const dupInLocal = photosRef.current.find(p => p.id !== photo.id && p.image_hash === photo.image_hash);
            if (dupInLocal) {
                await deletePhoto(photo.id);
                return;
            }
        }
        
        setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, isAnalyzing: true } : p));
        
        try {
            const result = await analyzeProductPhoto(photo.uri!, categories, tags, manufacturers, effectiveKey, aiProvider, customModel, photo.categoryId || null, photo.name);
            
            let finalCatId = result.categoryId || null;
            let finalMfrId = result.manufacturerId || null;
            
            if (result.newSubCategoryName && !result.manufacturerId && addManufacturer) {
                const savedMfr = await addManufacturer(result.newSubCategoryName);
                if (savedMfr) finalMfrId = savedMfr.id;
            }
            
            const allTagNamesOrIds = [...(result.tagIds || []), ...(result.newTags || [])];
            const finalTagIds = await resolveTagIdsBatch(allTagNamesOrIds, tags, tagNameToIdMap, setTags);

            setPhotos(prev => {
                const next = prev.map(p => {
                    if (p.id !== photo.id) return p;

                    const safeOldTagIds = Array.isArray(p.tagIds) ? p.tagIds : (typeof p.tagIds === 'string' ? [p.tagIds] : []);
                    const mergedTagIds = Array.from(new Set([...safeOldTagIds, ...finalTagIds]));

                    return { 
                        ...p, 
                        categoryId: p.categoryId && p.categoryId !== 'uncategorized' ? p.categoryId : finalCatId, 
                        manufacturerId: p.manufacturerId || finalMfrId, 
                        tagIds: mergedTagIds,
                        name: shouldUpdateName(p.name) ? (result.name || p.name) : p.name,
                        model_number: p.model_number || result.modelNumber || null,
                        dimensions: (!p.dimensions || p.dimensions.length === 0) ? (result.dimensions || null) : p.dimensions,
                        updatedAt: new Date().toISOString(),
                        isAnalyzing: false 
                    };
                });
                photosRef.current = next;
                saveData('product_photos', next);
                return next;
            });

            if (user) {
                const updatedPhoto = photosRef.current.find(p => p.id === photo.id);
                if (updatedPhoto) {
                    await savePhotoToCloud(user.id, updatedPhoto);
                }
            }
        } catch (err: any) {
            setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, isAnalyzing: false } : p));
            throw err; 
        }
    };

    try {
        for (let i = 0; i < unProcessed.length; i += CONCURRENCY) {
            if (isCancelled()) break;
            
            const batch = unProcessed.slice(i, i + CONCURRENCY);
            const batchResults = await Promise.allSettled(batch.map(p => processPhoto(p)));
            
            completedCount += batchResults.filter(r => r.status === 'fulfilled').length;
            setBatchProgress(prev => ({ ...prev, current: Math.min(i + CONCURRENCY, unProcessed.length) }));
        }
    } finally {
        actualSetLoadingState('idle');
        setBatchProgress({ current: 0, total: 0 });
        setPhotos(prev => prev.map(p => 
            p.isAnalyzing ? { ...p, isAnalyzing: false } : p
        ));
        setAlertDialog({ title: '处理完成', message: `处理终止或完成！共处理了 ${completedCount} 张照片。` });
    }
  };

  const handleSingleAiAnalyze = async (imageData: string | null, catId?: string, editPhotoId?: string | null) => {
    if (!imageData) return;
    actualSetLoadingState('analyzing');
    setAiDebugInfo({ step: '准备中', message: '正在初始化...' });
    
    const controller = new AbortController();
    currentAnalysisController.current = controller;
    const signal = controller.signal;
    
    try {
      const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;
      setAiDebugInfo({ step: '检查金钥', message: `Key 读取: ${apiKey ? apiKey.substring(0, 5) + '...' : '空'}` });
      if (!apiKey) throw new Error('API Key 为空');

      let originalName;
      if (editPhotoId) {
          const photo = photosRef.current.find(p => p.id === editPhotoId);
          originalName = photo?.name;
      }

      setAiDebugInfo({ step: '发送请求', message: `图片大小: ${imageData.length} bytes, Provider: ${aiProvider}` });
      
      const result = await analyzeProductPhoto(imageData, categories, tags, manufacturers, geminiApiKey, aiProvider, customModel, catId, originalName, signal);
      
      if (signal.aborted) throw new Error('Aborted');

      setAiDebugInfo({ step: '完成', message: 'AI 识别成功' });
      
      setTimeout(() => {
        if (currentAnalysisController.current === controller) {
          setAiDebugInfo(null);
          currentAnalysisController.current = null;
        }
      }, 3000);

      // Same manufacturer/tag ID creation logic as batch if new ones are suggested
      if (result.newSubCategoryName && !result.manufacturerId && addManufacturer) {
        const savedMfr = await addManufacturer(result.newSubCategoryName);
        if (savedMfr) result.manufacturerId = savedMfr.id;
      } else if (result.newSubCategoryName && !result.manufacturerId) {
        const tempMfr = { id: `temp-mfr-${Date.now()}`, name: result.newSubCategoryName };
        setManufacturers(prev => [...prev, tempMfr]);
        result.manufacturerId = tempMfr.id;
      }
      
      let finalTagIdsFromAi = result.tagIds || [];
      const allSuggestedTags = Array.from(new Set([
        ...finalTagIdsFromAi,
        ...(result.newTags || [])
      ]));
      
      finalTagIdsFromAi = await resolveTagIdsBatch(allSuggestedTags, tags, tagNameToIdMap, setTags);

      if (editPhotoId) {
        // Calculate new photos list
        const nextPhotos = photosRef.current.map(p => {
          if (p.id !== editPhotoId) return p;
          
          let finalCatId = result.categoryId || p.categoryId;
          let finalMfrId = result.manufacturerId || p.manufacturerId;
          
          const safeOldTagIds = Array.isArray(p.tagIds) ? p.tagIds : (typeof p.tagIds === 'string' ? [p.tagIds] : []);
          const mergedTagIds = Array.from(new Set([...safeOldTagIds, ...finalTagIdsFromAi]));

          const updatedPhoto = { 
            ...p, 
            categoryId: finalCatId,
            manufacturerId: finalMfrId,
            tagIds: mergedTagIds,
            name: shouldUpdateName(p.name) ? (result.name || p.name) : p.name,
            model_number: p.model_number || result.modelNumber || null,
            dimensions: (!p.dimensions || p.dimensions.length === 0)
              ? (result.dimensions || null)
              : p.dimensions,
            updatedAt: new Date().toISOString(),
            isAnalyzing: false 
          };
          
          return updatedPhoto;
        });

        // Update state and persistence
        setPhotos(nextPhotos);
        photosRef.current = nextPhotos;
        await saveData('product_photos', nextPhotos);
        
        // Backup to cloud outside state updater
        if (user) {
          const updatedPhoto = nextPhotos.find(p => p.id === editPhotoId);
          if (updatedPhoto) {
            await savePhotoToCloud(user.id, updatedPhoto);
          }
        }
      }
      // Populate form state properties to return them
      result.tagIds = finalTagIdsFromAi;
      return result;
    } catch (err: any) {
      console.error("[ERROR] Single AI analysis failed:", err);
      setAiDebugInfo({ step: '错误', message: '识别失败', error: err.message });
      setAlertDialog({ title: 'AI 识别失败', message: err.message || '识别过程出现问题' });
    } finally {
      actualSetLoadingState('idle');
    }
  };

  const handlePhotoImport = async (
    e: React.ChangeEvent<HTMLInputElement>,
    useAi: boolean
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files) as File[];
    
    actualSetLoadingState('importing');
    setIsSyncing(true); // Global loading overlay
    setImportTotal(fileArray.length);
    setImportProgress(0);
    setActiveScreen('home');

    const sessionHashes = new Set<string>();
    let successCount = 0;
    let duplicateCount = 0;
    let failCount = 0;
    const failedFiles: string[] = [];

    const CHUNK_SIZE = 1; // Drop to 1 to save memory on mobile mapping
    let processed = 0;
    for (let i = 0; i < fileArray.length; i += CHUNK_SIZE) {
      const chunk = fileArray.slice(i, i + CHUNK_SIZE);
      const newPhotosDraft: Photo[] = [];
      
      for (const file of chunk) {
        processed++;
        setImportProgress(processed);
        try {
          // 1. Hash Calculation
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

          if (user) {
             const dupInCloud = await checkImageHashExists(hash);
             if (dupInCloud) {
                duplicateCount++;
                continue;
             }
          }
          
          sessionHashes.add(hash);

          // 4. Processing
          const rawUri = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target?.result as string);
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsDataURL(file);
          });
          
          if (!rawUri) continue;
          
          const compressedUri = await compressImage(rawUri, IMAGE_COMPRESS.MAX_WIDTH, IMAGE_COMPRESS.QUALITY);

          // Use a temporary ID for local state, will be replaced by DB UUID after sync
          const photoId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          const newPhoto: Photo = {
            id: photoId,
            storageId: photoId,
            item_code: generateItemCode(),
            manual_code: '',
            image_hash: hash,
            name: file.name.split('.')[0] || '未命名产品',
            description: '',
            image_url: '',
            uri: compressedUri,
            categoryId: null,
            manufacturerId: null,
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
                const result = await analyzeProductPhoto(targetPhoto.uri!, categories, tags, manufacturers, geminiApiKey, aiProvider, customModel);
                
                let finalCatId = result.categoryId || null;
                let finalMfrId = result.manufacturerId || null;
                
                if (result.newSubCategoryName && !result.manufacturerId && addManufacturer) {
                  const savedMfr = await addManufacturer(result.newSubCategoryName);
                  if (savedMfr) finalMfrId = savedMfr.id;
                }
                
                const allSuggestedTags = Array.from(new Set([
                  ...(result.tagIds || []),
                  ...(result.newTags || [])
                ]));
                
                const finalTagIds = await resolveTagIdsBatch(allSuggestedTags, tags, tagNameToIdMap, setTags);

                setPhotos(prev => prev.map(p => {
                   if (p.id !== photoId) return p;
                   const updatedPhoto = {
                     ...p,
                     isAnalyzing: false,
                     name: shouldUpdateName(p.name) ? (result.name || p.name) : p.name,
                     categoryId: finalCatId,
                     manufacturerId: finalMfrId,
                     tagIds: finalTagIds,
                     model_number: p.model_number || result.modelNumber || '',
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
          failedFiles.push(file.name);
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
    
    if (user && successCount > 0) {
      const newPhotos = photosRef.current;
      await syncPhotosToCloud(user.id, newPhotos);
      setCloudCount(newPhotos.length);
    }
    
    setIsSyncing(false);
    actualSetLoadingState('idle');
    
    if (successCount > 0 || duplicateCount > 0 || failCount > 0) {
       let msg = `成功處理了 ${successCount} 張照片。`;
       if (duplicateCount > 0) msg += `\n跳過了 ${duplicateCount} 張重複照片。`;
       if (failCount > 0) msg += `\n有 ${failCount} 張失敗: ${failedFiles.join(', ')}`;
       
       setAlertDialog({ 
         title: '上傳完成', 
         message: msg
       });
    }
  };
  
  const deletePhoto = async (idOrIds: string | string[]) => {
      const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
      const photosToDelete = photosRef.current.filter(p => ids.includes(p.id));
      
      const affectedGroups = new Set<string>();
      photosToDelete.forEach(p => {
        if (p.groupId && p.isGroupCover) {
          affectedGroups.add(p.groupId);
        }
      });

      if (user) {
        await Promise.all(photosToDelete.map(photo => deletePhotoFromCloud(user.id, photo)));
      }

      let newPhotos = photosRef.current.filter(p => !ids.includes(p.id));

      for (const groupId of affectedGroups) {
        const remainingGroupPhotos = newPhotos.filter(p => p.groupId === groupId);
        if (remainingGroupPhotos.length > 0 && !remainingGroupPhotos.some(p => p.isGroupCover)) {
          const sorted = [...remainingGroupPhotos].sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          const newCover = { ...sorted[0], isGroupCover: true };
          newPhotos = newPhotos.map(p => p.id === newCover.id ? newCover : p);
          
          if (user) {
            savePhotoToCloud(user.id, newCover).catch(err => 
              console.error(`[ERROR] Failed to reassign group cover for group ${groupId}:`, err)
            );
          }
        }
      }

      setPhotos(newPhotos);
      setCloudCount(newPhotos.length);
      saveData('product_photos', newPhotos);
  };

  const updatePhoto = async (updatedPhoto: Photo) => {
    const photoWithTime = { ...updatedPhoto, updatedAt: new Date().toISOString() };
    // 1. Immediately update UI
    setPhotos(prev => prev.map(p => p.id === photoWithTime.id ? photoWithTime : p));
    saveData('product_photos', photosRef.current.filter(p => p.id !== photoWithTime.id).concat(photoWithTime));
    
    // 2. Immediately update cloud
    if (user) {
       await savePhotoToCloud(user.id, photoWithTime);
    }
  };

  return {
    photos, setPhotos,
    loadingState: actualSetLoadingState, // We should return the setter if needed, but the current UI uses the state
    isImporting: (loadingState || internalLoadingState) === 'importing',
    importProgress, importTotal, batchProgress,
    aiDebugInfo, abortAnalysis,
    cloudCount, setCloudCount,
    handleSingleAiAnalyze,
    handleBatchAiIdentify, 
    handleGroupAiIdentify: async (groupPhotos: Photo[]) => {
      if (groupPhotos.length === 0) return;
      const effectiveKey = geminiApiKey || process.env.GEMINI_API_KEY;
      if (!effectiveKey) {
        setAlertDialog({ title: '提示', message: '請先在設定中設定 AI 金鑰' });
        return;
      }

      actualSetLoadingState('analyzing');
      setAiDebugInfo({ step: '群組識別', message: '正在分析第一張照片...' });

      try {
        // 1. Sort to find the cover or first photo
        const sorted = [...groupPhotos].sort((a, b) => {
          if (a.isGroupCover) return -1;
          if (b.isGroupCover) return 1;
          return 0;
        });
        const firstPhoto = sorted[0];

        // 2. Analyze the first photo
        const result = await analyzeProductPhoto(
          firstPhoto.uri || firstPhoto.image_url, 
          categories, tags, manufacturers, 
          effectiveKey, aiProvider, customModel, 
          firstPhoto.categoryId
        );

        // 3. Resolve tags and manufacturers as in single analysis
        if (result.newSubCategoryName && !result.manufacturerId && addManufacturer) {
          const savedMfr = await addManufacturer(result.newSubCategoryName);
          if (savedMfr) result.manufacturerId = savedMfr.id;
        } else if (result.newSubCategoryName && !result.manufacturerId) {
          const savedMfr = { id: `temp-mfr-${Date.now()}`, name: result.newSubCategoryName };
          setManufacturers(prev => [...prev, savedMfr]);
          result.manufacturerId = savedMfr.id;
        }

        const allTagNamesOrIds = [...(result.tagIds || []), ...(result.newTags || [])];
        const finalTagIds = await resolveTagIdsBatch(allTagNamesOrIds, tags, tagNameToIdMap, setTags);

        // 4. Apply results to ALL photos in the group
        const groupIds = groupPhotos.map(p => p.id);
        const nextPhotos = photosRef.current.map(p => {
          if (!groupIds.includes(p.id)) return p;

          return {
            ...p,
            name: result.name || p.name,
            categoryId: result.categoryId || p.categoryId,
            manufacturerId: result.manufacturerId || p.manufacturerId,
            tagIds: finalTagIds,
            model_number: result.modelNumber || p.model_number,
            dimensions: result.dimensions || p.dimensions,
            updatedAt: new Date().toISOString()
          };
        });

        setPhotos(nextPhotos);
        photosRef.current = nextPhotos;
        await saveData('product_photos', nextPhotos);

        // 5. Sync all to cloud
        if (user) {
          await Promise.all(
            nextPhotos
              .filter(p => groupIds.includes(p.id))
              .map(p => savePhotoToCloud(user.id, p))
          );
        }

        setAiDebugInfo(null);
        setAlertDialog({ title: '群組識別完成', message: `已將第一張照片的識別結果套用到群組內的所有 ${groupPhotos.length} 張照片。` });
      } catch (err: any) {
        console.error("[ERROR] Group AI analysis failed:", err);
        setAlertDialog({ title: '識別失敗', message: err.message || '群組識別過程出現問題' });
      } finally {
        actualSetLoadingState('idle');
      }
    },
    handlePhotoImport, deletePhoto, updatePhoto
  };
};
