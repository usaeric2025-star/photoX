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
  syncPhotosToCloud,
  deletePhotosBatch,
  savePhotosToCloudBatch
} from '../services/supabaseService';
import { resolveTagIdsBatch } from '../utils/tagUtils';
import { analyzeProductPhoto, translateDescription } from '../services/geminiService';
import { loadData, saveData } from '../utils/indexedDB';
import { useGalleryContext } from '../context/GalleryContext';
import { useTasks } from './useTasks';
import { IMAGE_COMPRESS, AI_CONFIG } from '../constants/config';

const shouldUpdateName = (name: string | null | undefined): boolean => {
  if (!name || name.trim() === '') return true;
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  
  // If it's a number (including spaces/dashes), allow it to be updated with a better descriptive name
  if (/^[\d\s\-_]+$/.test(trimmed)) return true;

  // Common placeholders or file-extension-heavy names
  if (
    lower === 'furniture' ||
    lower === '未命名产品' ||
    lower === 'furniture record' ||
    /\.(jpg|jpeg|png|heic|webp)$/i.test(trimmed) ||
    /^(img|image|photo|dsc|pic)[\s_-]?\d+/i.test(lower)
  ) return true;

  // If name length is very small and likely not descriptive, or if it was just a placeholder
  if (trimmed.length < 3) return true;

  return false; // Otherwise, preserve the existing name
};

export const useAdminPhotos = (
  user: {id: string} | null, 
  geminiApiKey: string | undefined, 
  aiProvider: string, 
  customModel: string,
  adminUI?: {
    cloudCount: number | null;
    setCloudCount: (c: number | null) => void;
    loadingState?: string;
    setAlertDialog: (d: any) => void;
    showToast: (msg: string, type?: 'success' | 'error') => void;
    setActiveScreen: (s: string) => void;
    abortAnalysis: () => void;
    withLoading?: <T>(state: any, fn: () => Promise<T>) => Promise<T>;
  },
  adminSession?: {
    setIsSyncing: (v: boolean) => void;
  },
  addManufacturer?: (name: string) => Promise<any>
) => {
  const {
    photos, setPhotos,
    categories, setCategories,
    tags, setTags, tagNameToIdMap, tagIdToNameMap,
    manufacturers, setManufacturers
  } = useGalleryContext();

  const { setIsSyncing = () => {} } = adminSession || {};
  const { 
    setAlertDialog = () => {}, 
    setActiveScreen = () => {}, 
    showToast = (m: string) => {},
  } = adminUI || {};
  
  const [internalCloudCount, setInternalCloudCount] = useState<number | null>(null);
  const cloudCount = adminUI?.cloudCount ?? internalCloudCount;
  const setCloudCount = adminUI?.setCloudCount || setInternalCloudCount;

  const [internalLoadingState, setInternalLoadingState] = useState<'idle' | 'syncing' | 'analyzing' | 'importing'>('idle');
  
  // Use provided loadingState if available, otherwise use internal
  const currentLoadingState = adminUI?.loadingState !== undefined ? adminUI.loadingState : internalLoadingState;

  const runWithLoading = async <T,>(state: string, fn: () => Promise<T>): Promise<T> => {
      if (adminUI?.withLoading) {
          return adminUI.withLoading(state as any, fn);
      }
      setInternalLoadingState(state as any);
      try {
          return await fn();
      } finally {
          setInternalLoadingState('idle');
      }
  };

  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const { tasks, addTask, updateTask } = useTasks();
  
  const photosRef = useRef(photos);
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [aiDebugInfo, setAiDebugInfo] = useState<{ step: string; message: string; error?: string } | null>(null);
  const currentAnalysisController = useRef<AbortController | null>(null);

  // Auto-resume logic: If there's a running batch task on mount, restart it
  useEffect(() => {
    if (!isInitializing && photos.length > 0) {
      const runningBatchTask = tasks.find(t => t.status === 'running' && t.name.includes('批量 AI 識別'));
      if (runningBatchTask && !currentAnalysisController.current) {
        console.log('Resuming background task:', runningBatchTask.id);
        handleBatchAiIdentify(photos, runningBatchTask.id);
      }
    }
  }, [isInitializing, photos.length]);

  const abortAnalysis = (taskId?: string) => {
    if (currentAnalysisController.current) {
      currentAnalysisController.current.abort();
      currentAnalysisController.current = null;
      setAiDebugInfo({ step: '已取消', message: '用戶中斷了 AI 識別任务' });
      
      // Update background task status if taskId is known
      if (taskId) {
        updateTask(taskId, { status: 'cancelled', message: '用戶已取消任務' });
      } else {
        // Fallback: find any running AI task
        const runningAiTask = tasks.find(t => t.status === 'running' && t.name.includes('AI 識別'));
        if (runningAiTask) {
          updateTask(runningAiTask.id, { status: 'cancelled', message: '用戶已取消任務' });
        }
      }

      setInternalLoadingState('idle');
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
            // Reset isAnalyzing flag in case it was saved to cloud or stale locally
            const cleanPhotos = cloudPhotos.map(p => ({ ...p, isAnalyzing: false }));
            setPhotos(cleanPhotos);
            setCloudCount(cleanPhotos.length);
            // Overwrite local indexedDB
            await saveData('product_photos', cleanPhotos);
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
      photosToProcess: Photo[], 
      existingTaskId?: string
  ) => {
    const effectiveKey = geminiApiKey || process.env.GEMINI_API_KEY;
    const unProcessed = photosToProcess.filter(p => {
       const rawTagIds = Array.isArray(p.tagIds) ? p.tagIds : (typeof p.tagIds === 'string' ? [p.tagIds] : []);
       const hasAllTranslations = p.description_translations?.zh && p.description_translations?.en && p.description_translations?.ms;
       return (!p.categoryId || rawTagIds.length < 2 || !p.name || !hasAllTranslations) && !p.isAnalyzing;
    });
    
    if (unProcessed.length === 0) {
      if (existingTaskId) {
        updateTask(existingTaskId, { status: 'completed', progress: 100, message: '所有照片已識別完成' });
      } else {
        showToast('選中的照片已經包含完整的類別、標籤和翻譯，無需重新識別。', 'success');
      }
      return;
    }
    
    setBatchProgress({ current: 0, total: unProcessed.length });
    
    // Use existing task ID or create a new one
    const taskId = existingTaskId || addTask({
      name: `批量 AI 識別 (${unProcessed.length} 張)`,
      onCancel: () => abortAnalysis()
    });

    const CONCURRENCY = AI_CONFIG.CONCURRENCY;
    let completedCount = 0;
    const checkCancelled = () => {
        return currentAnalysisController.current?.signal.aborted;
    };
    
    // Define processPhoto locally to access context
    const processPhoto = async (photo: Photo): Promise<void> => {
        const controller = new AbortController();
        currentAnalysisController.current = controller;
        const signal = controller.signal;

        // ... (existing logic for hash check and isAnalyzing: true)
        if (photo.uri && !photo.image_hash) {
            const hash = calculateMD5(photo.uri);
            photo.image_hash = hash;
            setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, image_hash: hash } : p));
        }
        
        setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, isAnalyzing: true } : p));
        
        try {
            const result = await analyzeProductPhoto(photo.uri!, categories, tags, manufacturers, effectiveKey, aiProvider, customModel, photo.categoryId || null, photo.name, signal);
            
            if (result.description) {
              try {
                const translations = await translateDescription(result.description, effectiveKey, customModel, signal);
                result.description_translations = {
                  zh: result.description,
                  en: translations.en,
                  ms: translations.ms
                };
              } catch (e) {}
            }

            let finalCatId = result.categoryId || null;
            const allTagNamesOrIds = [...(result.tagIds || []), ...(result.newTags || [])];
            const finalTagIds = await resolveTagIdsBatch(allTagNamesOrIds, tags, tagNameToIdMap, setTags);
            const safeOldTagIds = Array.isArray(photo.tagIds) ? photo.tagIds : (typeof photo.tagIds === 'string' ? [photo.tagIds] : []);
            const mergedTagIds = Array.from(new Set([...safeOldTagIds, ...finalTagIds])).slice(0, 3);

            let updatedPhoto = { 
                ...photo, 
                categoryId: photo.categoryId && photo.categoryId !== 'uncategorized' ? photo.categoryId : finalCatId, 
                tagIds: mergedTagIds,
                name: shouldUpdateName(photo.name) ? (result.name || photo.name) : photo.name,
                description: (result.description && (!photo.description || !photo.description.trim())) ? result.description : photo.description,
                description_translations: result.description_translations || photo.description_translations,
                // manual_code is strictly manual, AI result is forced null in service
                manual_code: photo.manual_code,
                model_number: (result.modelNumber && (!photo.model_number || !photo.model_number.trim())) ? result.modelNumber : photo.model_number,
                dimensions: (result.dimensions && result.dimensions.length > 0) ? result.dimensions : photo.dimensions,
                updatedAt: new Date().toISOString(),
                isAnalyzing: false 
            };

            if (user) {
                const finalId = await savePhotoToCloud(user.id, updatedPhoto);
                updatedPhoto.id = finalId;
            }

            setPhotos(prev => {
                const next = prev.map(p => p.id === photo.id ? updatedPhoto : p);
                photosRef.current = next;
                saveData('product_photos', next);
                return next;
            });
        } catch (err: any) {
            setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, isAnalyzing: false } : p));
            if (err.name !== 'AbortError') throw err;
        }
    };

    try {
        for (let i = 0; i < unProcessed.length; i += CONCURRENCY) {
            if (checkCancelled()) break;
            
            const batch = unProcessed.slice(i, i + CONCURRENCY);
            const batchResults = await Promise.allSettled(batch.map(p => processPhoto(p)));
            
            const fulfilledCount = batchResults.filter(r => r.status === 'fulfilled').length;
            completedCount += fulfilledCount;
            
            const currentProgress = Math.min(i + CONCURRENCY, unProcessed.length);
            const progressPercent = (currentProgress / unProcessed.length) * 100;
            
            setBatchProgress({ current: currentProgress, total: unProcessed.length });
            updateTask(taskId, { 
              progress: progressPercent,
              message: `已處理 ${currentProgress}/${unProcessed.length} 張...`
            });
        }
        
        const total = unProcessed.length;
        const failedCount = total - completedCount;
        
        if (completedCount > 0) {
            updateTask(taskId, { 
              status: 'completed', 
              progress: 100, 
              message: `完成！處理 ${completedCount} 張${failedCount > 0 ? `，${failedCount} 張失敗` : ''}`
            });
            showToast(`AI 識別任務已在後台完成！成功處理 ${completedCount} 張照片。`, 'success');
        } else if (total > 0) {
            updateTask(taskId, { status: 'error', message: '任務執行失敗，請檢查網路或金鑰。' });
            showToast(`AI 識別失敗：所有 ${total} 張照片均未成功識別。`, 'error');
        }
    } catch (err: any) {
        updateTask(taskId, { status: 'error', message: `錯誤: ${err.message}` });
    } finally {
        currentAnalysisController.current = null;
        setBatchProgress({ current: 0, total: 0 });
        setPhotos(prev => prev.map(p => 
            p.isAnalyzing ? { ...p, isAnalyzing: false } : p
        ));
    }
  };

  const handleSingleAiAnalyze = async (imageData: string | null, catId?: string, editPhotoId?: string | null) => {
    if (!imageData) return;
    return runWithLoading('analyzing', async () => {
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

      setAiDebugInfo({ step: '內容分析', message: `圖片大小: ${imageData.length} bytes, Provider: ${aiProvider}` });
      
      const result = await analyzeProductPhoto(imageData, categories, tags, manufacturers, apiKey, aiProvider, customModel, catId, originalName, signal);
      
      if (signal.aborted) throw new Error('Aborted');

      // Step 2: Translation
      if (result.description) {
        setAiDebugInfo({ step: '正在翻譯', message: '正在生成英馬文描述...' });
        try {
          const translations = await translateDescription(result.description, apiKey, customModel, signal);
          result.description_translations = {
            zh: result.description,
            en: translations.en,
            ms: translations.ms
          };
        } catch (transErr) {
          console.warn("Translation sub-step failed:", transErr);
        }
      }

      setAiDebugInfo({ step: '完成', message: 'AI 識別成功' });
      
      setTimeout(() => {
        if (currentAnalysisController.current === controller) {
          setAiDebugInfo(null);
          currentAnalysisController.current = null;
        }
      }, 3000);

      let finalTagIdsFromAi = result.tagIds || [];
      const allSuggestedTags = Array.from(new Set([
        ...finalTagIdsFromAi,
        ...(result.newTags || [])
      ]));
      
      finalTagIdsFromAi = await resolveTagIdsBatch(allSuggestedTags, tags, tagNameToIdMap, setTags);

      if (editPhotoId) {
        // 1. Calculate updated object (locally)
        const photo = photosRef.current.find(p => p.id === editPhotoId);
        if (!photo) throw new Error('Photo not found');

        let finalCatId = result.categoryId || photo.categoryId;
        const safeOldTagIds = Array.isArray(photo.tagIds) ? photo.tagIds : (typeof photo.tagIds === 'string' ? [photo.tagIds] : []);
        const mergedTagIds = Array.from(new Set([...safeOldTagIds, ...finalTagIdsFromAi])).slice(0, 3);

        let updatedPhoto = { 
          ...photo, 
          categoryId: finalCatId,
          tagIds: mergedTagIds,
          name: shouldUpdateName(photo.name) ? (result.name || photo.name) : photo.name,
          description: (result.description && (!photo.description || !photo.description.trim())) ? result.description : photo.description,
          description_translations: result.description_translations || photo.description_translations,
          // manual_code is strictly manual, AI result is forced null in service
          manual_code: photo.manual_code,
          model_number: (result.modelNumber && (!photo.model_number || !photo.model_number.trim())) ? result.modelNumber : photo.model_number,
          dimensions: (result.dimensions && result.dimensions.length > 0)
            ? result.dimensions
            : photo.dimensions,
          updatedAt: new Date().toISOString(),
          isAnalyzing: false 
        };
        
        // 2. Sync to cloud FIRST to get persistent ID
        if (user) {
          const finalId = await savePhotoToCloud(user.id, updatedPhoto);
          updatedPhoto.id = finalId;
        }

        // 3. Update state and persistence with the FINAL photo object
        const nextPhotos = photosRef.current.map(p => p.id === editPhotoId ? updatedPhoto : p);
        setPhotos(nextPhotos);
        photosRef.current = nextPhotos;
        await saveData('product_photos', nextPhotos);
      }
      // Populate form state properties to return them
      result.tagIds = finalTagIdsFromAi;
      return result;
    } catch (err: any) {
      console.error("[ERROR] Single AI analysis failed:", err);
      setAiDebugInfo({ step: '错误', message: '识别失败', error: err.message });
      showToast(`AI 识别失败: ${err.message || '识别过程出现问题'}`, 'error');
      throw err;
    }
    });
  };

  const handlePhotoImport = async (
    e: React.ChangeEvent<HTMLInputElement>,
    useAi: boolean
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files) as File[];
    
    return runWithLoading('importing', async () => {
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
    const allAddedPhotos: Photo[] = [];
    
    let aiTaskId = '';
    if (useAi && fileArray.length > 0) {
      aiTaskId = addTask({
        name: `導入照片 AI 識別 (${fileArray.length} 張)`,
        onCancel: () => abortAnalysis()
      });
    }

    let aiCompletedCount = 0;
    const updateAiProgress = () => {
      if (aiTaskId) {
        aiCompletedCount++;
        const progress = (aiCompletedCount / fileArray.length) * 100;
        updateTask(aiTaskId, { 
          progress,
          message: `正在識別 ${aiCompletedCount}/${fileArray.length}...`,
          status: aiCompletedCount === fileArray.length ? 'completed' : 'running'
        });
      }
    };

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

          const duplicate = photosRef.current.find(p => p.image_hash === hash);
          if (duplicate || sessionHashes.has(hash)) {
            duplicateCount++;
            if (useAi) updateAiProgress(); // Still counts as "processed" for AI task
            continue;
          }

          if (user) {
             const dupInCloud = await checkImageHashExists(hash);
             if (dupInCloud) {
                duplicateCount++;
                if (useAi) updateAiProgress();
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
          
          if (!rawUri) {
            if (useAi) updateAiProgress();
            continue;
          }
          
          const compressedUri = await compressImage(rawUri, IMAGE_COMPRESS.MAX_WIDTH, IMAGE_COMPRESS.QUALITY);
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
          allAddedPhotos.push(newPhoto);
          successCount++;
          
          if (useAi) {
            (async (targetPhoto: Photo) => {
              try {
                const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;
                const result = await analyzeProductPhoto(targetPhoto.uri!, categories, tags, manufacturers, apiKey, aiProvider, customModel);
                
                if (result.description && apiKey) {
                  try {
                    const translations = await translateDescription(result.description, apiKey, customModel);
                    result.description_translations = {
                      zh: result.description,
                      en: translations.en,
                      ms: translations.ms
                    };
                  } catch (e) {}
                }

                let finalCatId = result.categoryId || null;
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
                     tagIds: finalTagIds.slice(0, 3),
                     description_translations: result.description_translations || p.description_translations,
                     model_number: p.model_number || result.modelNumber || '',
                     dimensions: (result.dimensions && result.dimensions.length > 0) ? result.dimensions : p.dimensions
                   };
                   
                   if (user) {
                     savePhotoToCloud(user.id, updatedPhoto).catch(e => console.error("Process queue backup failed:", e));
                   }
                   
                   return updatedPhoto;
                }));
              } catch (err: any) {
                setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, isAnalyzing: false } : p));
              } finally {
                updateAiProgress();
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
    
    if (user && successCount > 0 && allAddedPhotos.length > 0) {
      try {
        const { savePhotosToCloudBatch } = await import('../services/photoService');
        const syncedPhotos = await savePhotosToCloudBatch(user.id, allAddedPhotos);
        
        // Update state with confirmed IDs from cloud
        setPhotos(prev => {
          const next = prev.map(p => {
             // Match by storageId (local unique ref) or image_hash
             const found = syncedPhotos.find(s => 
               (p.storageId && s.storageId === p.storageId) || 
               (p.image_hash && s.image_hash === p.image_hash)
             );
             if (found) {
               console.log(`[Sync] Mapping local ${p.id} to cloud ${found.id}`);
               return { ...p, id: found.id };
             }
             return p;
          });
          photosRef.current = next;
          saveData('product_photos', next); // Force save to local storage
          return next;
        });
        
        setCloudCount(photosRef.current.length);
      } catch (e: any) {
         console.error('Cloud upload block failed:', e);
         showToast('云端同步过程出现问题，但已保存在本地 / Cloud upload had some issues', 'error');
      }
    }
    
    setIsSyncing(false);
    
    if (successCount > 0 || duplicateCount > 0 || failCount > 0) {
       let msg = `成功處理并压缩了 ${successCount} 張照片。`;
       if (duplicateCount > 0) msg += ` 跳過了 ${duplicateCount} 張重複。`;
       if (failCount > 0) msg += ` 有 ${failCount} 張失敗: ${failedFiles.join(', ')}`;
       
       showToast(msg, successCount > 0 ? 'success' : 'error');
    }
    }); // runWithLoading end
  };
  
  const deletePhoto = async (idOrIds: string | string[], suppressAlert: boolean = false) => {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    const photosToDelete = photosRef.current.filter(p => ids.includes(p.id));
    
    try {
      const previousPhotos = photosRef.current;
      let nextPhotosList = photosRef.current.filter(p => !ids.includes(p.id));

      // Optimistic Group Cover handling
      const affectedGroups = new Set<string>();
      photosToDelete.forEach(p => {
        if (p.groupId && p.isGroupCover) {
          affectedGroups.add(p.groupId);
        }
      });
      
      for (const groupId of affectedGroups) {
        const remainingGroupPhotos = nextPhotosList.filter(p => p.groupId === groupId);
        if (remainingGroupPhotos.length > 0 && !remainingGroupPhotos.some(p => p.isGroupCover)) {
          const sorted = [...remainingGroupPhotos].sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          const newCover = { ...sorted[0], isGroupCover: true };
          nextPhotosList = nextPhotosList.map(p => p.id === newCover.id ? newCover : p);
        }
      }

      // Apply optimistic UI
      setPhotos(nextPhotosList);
      setCloudCount(nextPhotosList.length);
      await saveData('product_photos', nextPhotosList);

      // Perform bulk cloud sync
      if (user) {
        await deletePhotosBatch(user.id, photosToDelete);
        // Re-sync group covers if any
        for (const groupId of affectedGroups) {
           const photo = nextPhotosList.find(p => p.groupId === groupId && p.isGroupCover);
           if (photo && user) savePhotoToCloud(user.id, photo).catch(console.error);
        }
      }

      if (!suppressAlert) showToast('删除成功', 'success');
    } catch (err: any) {
      console.error("[ERROR] Delete photo failed:", err);
      // Rollback
      setPhotos(photosRef.current);
      if (!suppressAlert) showToast('删除失败：' + err.message, 'error');
    }
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
    isImporting: currentLoadingState === 'importing',
    importProgress, importTotal, batchProgress,
    aiDebugInfo, abortAnalysis,
    cloudCount, setCloudCount,
    handleSingleAiAnalyze,
    handleTranslate: async (zhText: string) => {
      const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('請先在設定中設定 AI 金鑰');
      return await translateDescription(zhText, apiKey, customModel);
    },
    handleBatchAiIdentify, 
    handleGroupAiIdentify: async (groupPhotos: Photo[]) => {
      if (groupPhotos.length === 0) return;
      const effectiveKey = geminiApiKey || process.env.GEMINI_API_KEY;
      if (!effectiveKey) {
        showToast('請先在設定中設定 AI 金鑰', 'error');
        return;
      }

      return runWithLoading('analyzing', async () => {
      setAiDebugInfo({ step: '群組識別', message: '正在分析第一張照片...' });
      
      // Show analyzing status on all photos in group
      const groupIds = groupPhotos.map(p => p.id);
      setPhotos(prev => prev.map(p => groupIds.includes(p.id) ? { ...p, isAnalyzing: true } : p));

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

        // 3. Translation sub-step
        if (result.description) {
          setAiDebugInfo({ step: '語言翻譯', message: '正在完成多語言描述...' });
          try {
            const translations = await translateDescription(result.description, effectiveKey, customModel);
            result.description_translations = {
              zh: result.description,
              en: translations.en,
              ms: translations.ms
            };
          } catch (e) {}
        }

        const allTagNamesOrIds = [...(result.tagIds || []), ...(result.newTags || [])];
        const finalTagIds = await resolveTagIdsBatch(allTagNamesOrIds, tags, tagNameToIdMap, setTags);

        // 4. Create updated objects
        const updatedGroupPhotos: Photo[] = groupPhotos.map(p => {
          return {
            ...p,
            name: shouldUpdateName(p.name) ? (result.name || p.name) : p.name,
            categoryId: result.categoryId && (p.categoryId === null || p.categoryId === 'uncategorized') ? result.categoryId : p.categoryId,
            tagIds: finalTagIds.slice(0, 3),
            description: (result.description && (!p.description || !p.description.trim())) ? result.description : p.description,
            description_translations: result.description_translations || p.description_translations,
            // manual_code is strictly manual, AI result is forced null in service
            manual_code: p.manual_code,
            model_number: (result.modelNumber && (!p.model_number || !p.model_number.trim())) ? result.modelNumber : p.model_number,
            dimensions: (result.dimensions && result.dimensions.length > 0) ? result.dimensions : p.dimensions,
            updatedAt: new Date().toISOString(),
            isAnalyzing: false
          };
        });

        // 5. Sync all to cloud FIRST to get persistent IDs if they were temp
        let syncedPhotos = updatedGroupPhotos;
        if (user) {
          syncedPhotos = await savePhotosToCloudBatch(user.id, updatedGroupPhotos);
        }

        // 6. Update local state with synced data
          const nextPhotos = photosRef.current.map(p => {
            // If this photo was in the input list
            const originalPhoto = updatedGroupPhotos.find(up => up.id === p.id);
            if (!originalPhoto) return p;

            // Find the synced version - STRICT MATCHING using a more precise UUID test
            const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            
            const synced = syncedPhotos.find(sp => 
              (sp.id === p.id && isUUID(p.id)) || // Real UUID match
              (p.storageId && sp.storageId === p.storageId) || // Local ID match
              (p.image_hash && sp.image_hash === p.image_hash) // Hash match fallback
            );

            return synced || originalPhoto;
          });

        setPhotos(nextPhotos);
        photosRef.current = nextPhotos;
        await saveData('product_photos', nextPhotos);

        setAiDebugInfo(null);
        showToast(`群組識別完成: 已將識別結果套用到群組內的所有 ${groupPhotos.length} 張照片。`, 'success');
      } catch (err: any) {
        console.error("[ERROR] Group AI analysis failed:", err);
        setPhotos(prev => prev.map(p => groupIds.includes(p.id) ? { ...p, isAnalyzing: false } : p));
        showToast(`識別失敗: ${err.message || '群組識別過程出現問題'}`, 'error');
        throw err;
      }
      });
    },
    handlePhotoImport, deletePhoto, updatePhoto
  };
};
