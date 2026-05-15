import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { User, Photo, Category, Tag, Manufacturer } from '../types';
import { 
  checkImageHashExists, 
  savePhotosToCloudBatch,
  savePhotoToCloud
} from '../services/photoMutationService';
import { compressImage } from '../services/storageService';
import { calculateMD5, calculateMD5FromFile, calculateMD5FromArrayBuffer, generateItemCode, cleanObject } from '../services/utils';
import { formatDate } from '../utils/dateFormat';
import { saveData } from '../utils/indexedDB';
import { IMAGE_COMPRESS } from '../constants/config';
import { analyzeProductPhoto, translateDescription } from '../services/geminiService';
import { resolveTagIdsBatch } from '../utils/tagUtils';
import { safeArray } from '../lib/utils';

// Helper functions moved from useAdminPhotos
const shouldUpdateName = (name: string | null | undefined): boolean => {
  if (!name || name.trim() === '') return true;
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  
  if (/^[\d\s\-_]+$/.test(trimmed)) return true;
  if (
    lower === 'furniture' ||
    lower === '未命名产品' ||
    lower === 'furniture record' ||
    /\.(jpg|jpeg|png|heic|webp)$/i.test(trimmed) ||
    /^(img|image|photo|dsc|pic)[\s_-]?\d+/i.test(lower)
  ) return true;
  if (trimmed.length < 3) return true;
  return false;
};

const cleanAiName = (name: string | null | undefined): string | null => {
  if (!name) return null;
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  const measurementPattern = /([hwdlt]\d+)|(\d+["”']|cm|inch|mm)|(\d+\s*x\s*\d+)/i;
  
  if (measurementPattern.test(trimmed)) {
    console.warn('[AI] Rejecting name due to measurement detected:', trimmed);
    return null;
  }
  return trimmed;
};

export const usePhotoImport = (
  user: User | null,
  adminUI: any,
  adminSession: any,
  geminiApiKey: string | undefined,
  aiProvider: string,
  customModel: string,
  categories: Category[],
  tags: Tag[],
  manufacturers: Manufacturer[],
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>,
  setCloudCount: (c: number | null) => void,
  addManufacturer: (name: string) => Promise<Manufacturer>,
  runWithLoading: <T>(state: any, fn: () => Promise<T>) => Promise<T>,
  addTask: (task: any) => string,
  updateTask: (id: string, updates: any) => void,
  abortAnalysis: () => void,
  tagNameToIdMap: Map<string, string>,
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>,
  photosRef: React.MutableRefObject<Photo[]>,
  handleError: (error: any, context?: string) => void
) => {
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);

  const { setIsSyncing = () => {} } = adminSession || {};
  const { setActiveScreen = () => {} } = adminUI || {};

  const handlePhotoImport = async (
    e: React.ChangeEvent<HTMLInputElement>,
    useAi: boolean
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files) as File[];
    const sFileArray = safeArray(fileArray);
    
    // HEIC Detection Alert
    const hasHeic = sFileArray.some(f => f.name.toLowerCase().endsWith('.heic') || f.type === 'image/heic');
    if (hasHeic) {
      toast.info('检测到 HEIC 格式照片，部分手机浏览器可能无法直接显示，建议转换为 JPG 后上传');
    }
    
    return runWithLoading('importing', async () => {
      setIsSyncing(true);
      setImportTotal(sFileArray.length);
      setImportProgress(0);
      setActiveScreen('home');

      const sessionHashes = new Set<string>();
      let successCount = 0;
      let duplicateCount = 0;
      let failCount = 0;
      const failedFiles: string[] = [];

      const CHUNK_SIZE = 1;
      let processed = 0;
      const allAddedPhotos: Photo[] = [];
      
      let aiTaskId = '';
      if (useAi && sFileArray.length > 0) {
        aiTaskId = addTask({
          name: `导入照片 AI 识别 (${sFileArray.length} 张)`,
          onCancel: () => abortAnalysis()
        });
      }

      let aiCompletedCount = 0;
      const updateAiProgress = () => {
        if (aiTaskId) {
          aiCompletedCount++;
          const progress = (aiCompletedCount / sFileArray.length) * 100;
          updateTask(aiTaskId, { 
            progress,
            message: `正在识别 ${aiCompletedCount}/${sFileArray.length}...`,
            status: aiCompletedCount === sFileArray.length ? 'completed' : 'running'
          });
        }
      };

      for (let i = 0; i < sFileArray.length; i += CHUNK_SIZE) {
        const chunk = sFileArray.slice(i, i + CHUNK_SIZE);
        const newPhotosDraft: Photo[] = [];
        
        const sChunk = safeArray(chunk);
        for (const file of sChunk) {
          processed++;
          setImportProgress(processed);
          try {
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
              if (useAi) updateAiProgress();
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
              storageId: hash, // Use hash as storageId for persistent, content-addressable storage
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
              createdAt: formatDate(new Date()),
              groupId: null,
              isAnalyzing: !!useAi
            };
            
            newPhotosDraft.push(newPhoto);
            allAddedPhotos.push(newPhoto);
            successCount++;
            
            if (useAi) {
              (async (targetPhoto: Photo) => {
                try {
                  const apiKey = geminiApiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
                  const resRaw = await analyzeProductPhoto(targetPhoto.uri!, categories, tags, manufacturers, apiKey, aiProvider, customModel);
                  const result = cleanObject(resRaw);
                  const aiName = cleanAiName(result.name);
                  
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
                    ...safeArray<string>(result.tagIds),
                    ...safeArray<string>(result.newTags)
                  ]));
                  
                  const finalTagIds = await resolveTagIdsBatch(allSuggestedTags, tags, tagNameToIdMap, setTags);

                  setPhotos(prev => prev.map(p => {
                     // Robust matching using storageId or original id
                     if (p.id !== photoId) return p;
                     
                     const updatedPhoto = {
                       ...p,
                       isAnalyzing: false,
                       name: shouldUpdateName(p.name) ? (aiName || p.name) : p.name,
                       categoryId: finalCatId,
                       tagIds: finalTagIds.slice(0, 3),
                       description_translations: result.description_translations || p.description_translations,
                       model_number: p.model_number || result.modelNumber || '',
                       dimensions: (safeArray(result.dimensions).length > 0) ? result.dimensions : p.dimensions
                     };
                     
                     if (user) {
                       savePhotoToCloud(user.id, updatedPhoto).then(persistedId => {
                          // If savePhotoToCloud updated URLs in updatedPhoto (it does in-place), 
                          // we should trigger another refresh to ensure state has them.
                          setPhotos(curr => curr.map(item => 
                            (item.storageId === photoId || item.id === persistedId)
                              ? { ...item, ...updatedPhoto, id: persistedId } 
                              : item
                          ));
                       }).catch(e => handleError(e, "同步备份失败"));
                     }
                     
                     return updatedPhoto;
                  }));
                } catch (err) {
                  setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, isAnalyzing: false } : p));
                } finally {
                  updateAiProgress();
                }
              })(newPhoto);
            }
          } catch (err) {
            handleError(err, `导入过程处理文件失败: ${file.name}`);
            failCount++;
            failedFiles.push(file.name);
          }
        }
        
        if (newPhotosDraft.length > 0) {
          setPhotos(prev => {
            const next = [...newPhotosDraft, ...prev];
            photosRef.current = next;
            saveData('product_photos', next);
            return next;
          });
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      if (user && successCount > 0 && safeArray(allAddedPhotos).length > 0) {
        try {
          const syncedPhotos = await savePhotosToCloudBatch(user.id, allAddedPhotos);
          
          setPhotos(prev => {
            const next = prev.map(p => {
               const found = syncedPhotos.find(s => 
                 (p.storageId && s.storageId === p.storageId) || 
                 (p.image_hash && s.image_hash === p.image_hash)
               );
               if (found) {
                 return { 
                   ...p, 
                   id: found.id,
                   image_url: found.image_url,
                   thumb_url: found.thumb_url
                 };
               }
               return p;
            });
            photosRef.current = next;
            saveData('product_photos', next);
            return next;
          });
          
          setCloudCount(photosRef.current.length);
        } catch (e) {
           handleError(e, '云端同步过程出现问题');
        }
      }
      
      setIsSyncing(false);
      
      if (successCount > 0 || duplicateCount > 0 || failCount > 0) {
         let msg = `成功处理并压缩了 ${successCount} 张照片。`;
         if (duplicateCount > 0) msg += ` 跳过了 ${duplicateCount} 张重复。`;
         if (failCount > 0) msg += ` 有 ${failCount} 张失败: ${failedFiles.join(', ')}`;
         
         if (successCount > 0) toast.success(msg);
         else toast.error(msg);
      }
    });
  };

  return { handlePhotoImport, importProgress, importTotal };
};
