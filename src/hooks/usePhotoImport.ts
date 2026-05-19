import { useState, useRef } from 'react';
import { User, Photo, Category, Tag, Manufacturer } from '../types';
import { processImageFile } from '../utils/imageProcess';
import { 
  checkImageHashExists, 
  savePhotoToCloud
} from '../services/photoMutationService';
import { generateItemCode, cleanObject } from '../services/utils';
import { formatDate } from '../utils/dateFormat';
import { saveData } from '../utils/indexedDB';
import { analyzeProductPhoto, translateDescription } from '../services/geminiService';
import { resolveTagIdsBatch } from '../utils/tagUtils';
import { safeArray } from '../lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from './queries/keys';
import { useInvalidatePhotos, useFeedback } from './';

// Helper functions 
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
  const measurementPattern = /([hwdlt]\d+)|(\d+["”']|cm|inch|mm)|(\d+\s*x\s*\d+)/i;
  
  if (measurementPattern.test(trimmed)) {
    console.warn('[AI] Rejecting name due to measurement detected:', trimmed);
    return null;
  }
  return trimmed;
};

export const usePhotoImport = (
  user: User | null,
  adminUI: { setActiveScreen: (s: 'home' | 'manage' | 'login') => void } | null,
  adminSession: { setIsSyncing: (v: boolean) => void } | null,
  geminiApiKey: string | undefined,
  aiProvider: string,
  customModel: string,
  categories: Category[],
  tags: Tag[],
  manufacturers: Manufacturer[],
  setCloudCount: (c: number | null) => void,
  addManufacturer: (name: string) => Promise<Manufacturer>,
  runWithLoading: <T>(state: string, fn: () => Promise<T>) => Promise<T>,
  addTask: (task: Omit<import('../types').Task, 'id'>) => string,
  updateTask: (id: string, updates: Partial<import('../types').Task>) => void,
  abortAnalysis: () => void,
  tagNameToIdMap: Map<string, string>,
  photosRef: React.MutableRefObject<Photo[]>,
  showError: (error: unknown, context?: string) => void
) => {
  const queryClient = useQueryClient();
  const invalidatePhotos = useInvalidatePhotos();
  const { showSuccess } = useFeedback();
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);

  const { setIsSyncing = () => {} } = adminSession || {};
  const { setActiveScreen = () => {} } = adminUI || {};

  const handlePhotoImport = async (
    e: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList | null } },
    useAi: boolean
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files) as File[];
    const sFileArray = safeArray(fileArray);
    
    // HEIC Detection Alert
    const hasHeic = sFileArray.some(f => f.name.toLowerCase().endsWith('.heic') || f.type === 'image/heic');
    if (hasHeic) {
      showSuccess('检测到 HEIC 格式照片，建议转换为 JPG 后上传 / HEIC detected, conversion recommended');
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

      let uploadTaskId = '';
      if (sFileArray.length > 0) {
        uploadTaskId = addTask({
          name: `上传照片 (${sFileArray.length} 张)`,
          status: 'running',
          progress: 0
        });
      }

      let aiTaskId = '';
      if (useAi && sFileArray.length > 0) {
        aiTaskId = addTask({
          name: `导入照片 AI 识别 (${sFileArray.length} 张)`,
          status: 'running',
          onCancel: () => abortAnalysis()
        });
      }

      let processedCount = 0;
      const updateProgress = () => {
        processedCount++;
        const progress = (processedCount / sFileArray.length) * 100;
        if (uploadTaskId) {
          updateTask(uploadTaskId, {
            progress,
            message: `正在上传 ${processedCount}/${sFileArray.length}...`,
            status: processedCount === sFileArray.length ? 'completed' : 'running'
          });
        }
        if (aiTaskId) {
          updateTask(aiTaskId, { 
            progress,
            message: `正在识别 ${processedCount}/${sFileArray.length}...`,
            status: processedCount === sFileArray.length ? 'completed' : 'running'
          });
        }
        if (processedCount === sFileArray.length) {
            setTimeout(() => {
                if (uploadTaskId) updateTask(uploadTaskId, { status: 'completed' });
                if (aiTaskId) updateTask(aiTaskId, { status: 'completed' });
            }, 3000);
        }
      };

      const tasks: Promise<void>[] = [];

      for (let i = 0; i < sFileArray.length; i++) {
        const file = sFileArray[i];
        setImportProgress(i + 1);
        
        try {
          const { hash, dataUrl } = await processImageFile(file);

          const duplicate = photosRef.current.find(p => p.image_hash === hash);
          if (duplicate || sessionHashes.has(hash)) {
            duplicateCount++;
            updateProgress();
            continue;
          }

          if (user) {
             const dupInCloud = await checkImageHashExists(hash);
             if (dupInCloud) {
                duplicateCount++;
                updateProgress();
                continue;
             }
          }
          
          sessionHashes.add(hash);
          const photoId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          const newPhoto: Photo = {
            id: photoId,
            storageId: hash, 
            item_code: generateItemCode(),
            manual_code: '',
            image_hash: hash,
            name: file.name.split('.')[0] || '未命名产品',
            description: '',
            image_url: '',
            uri: dataUrl,
            categoryId: null,
            manufacturerId: null,
            tagIds: [],
            createdAt: formatDate(new Date()),
            groupId: null,
            isAnalyzing: !!useAi,
            is_hidden: false,
            // Include file metadata for duplicate pseudo-hash check
            ...(file ? { _fileName: file.name, _fileSize: file.size, _lastModified: file.lastModified } : {})
          } as any;
          
          successCount++;
          
          // Add to local ref so it shows up in UI immediately
          photosRef.current.push(newPhoto);

          if (useAi) {
            tasks.push((async (targetId: string, targetUri: string, initialPhoto: Photo) => {
               try {
                 const apiKey = geminiApiKey;
                 const resRaw = await analyzeProductPhoto(targetUri, categories, tags, manufacturers, apiKey, aiProvider, customModel);
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

                 const finalTagIds = await resolveTagIdsBatch(
                   Array.from(new Set([...safeArray<string>(result.tagIds), ...safeArray<string>(result.newTags)])),
                   tags, tagNameToIdMap
                 );

                 const updated = {
                   ...initialPhoto,
                   isAnalyzing: false,
                   name: shouldUpdateName(initialPhoto.name) ? (aiName || initialPhoto.name) : initialPhoto.name,
                   categoryId: result.categoryId || initialPhoto.categoryId,
                   tagIds: finalTagIds.slice(0, 3),
                   description_translations: result.description_translations || initialPhoto.description_translations,
                   model_number: initialPhoto.model_number || result.modelNumber || '',
                   dimensions: (safeArray(result.dimensions).length > 0) ? result.dimensions : initialPhoto.dimensions
                 };
                 
                 // Update the local photo in the ref
                 const index = photosRef.current.findIndex(p => p.id === initialPhoto.id);
                 if (index !== -1) {
                    photosRef.current[index] = updated;
                 }

                 if (user) {
                   try {
                      const finalPhotoId = await savePhotoToCloud(user.id, updated);
                      const index = photosRef.current.findIndex(p => p.id === initialPhoto.id);
                      if (index !== -1) {
                        photosRef.current[index].id = finalPhotoId;
                      }
                     queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
                   } catch (saveErr: any) {
                     if (saveErr.name === 'DuplicatePhotoError') {
                       console.log(`[usePhotoImport:AI] Skipped duplicate photo: ${updated.name}`);
                       const index = photosRef.current.findIndex(p => p.id === initialPhoto.id);
                       if (index !== -1) {
                         photosRef.current.splice(index, 1);
                       }
                       duplicateCount++;
                       successCount--;
                       return;
                     }
                     throw saveErr;
                   }
                 }
               } catch (err) {
                 invalidatePhotos();
                 throw err;
               } finally {
                 updateProgress();
               }
            })(photoId, dataUrl, newPhoto));
          } else if (user) {
            if (!newPhoto.id || newPhoto.id.startsWith('temp-')) {
                console.error('[usePhotoImport] Invalid photoId before upload:', newPhoto.id);
                // We should probably not even attempt to upload if id is invalid
                tasks.push(Promise.reject(new Error('Invalid photo ID')));
            } else {
                tasks.push(
                  savePhotoToCloud(user.id, newPhoto)
                    .then((finalPhotoId) => {
                      // Update UI with real ID
                      const index = photosRef.current.findIndex(p => p.id === newPhoto.id);
                      if (index !== -1) {
                        photosRef.current[index].id = finalPhotoId;
                      }
                      invalidatePhotos();
                      updateProgress();
                    })
                    .catch((e) => {
                      if (e.name === 'DuplicatePhotoError') {
                        console.log(`[usePhotoImport] Skipped duplicate photo: ${newPhoto.name}`);
                        const index = photosRef.current.findIndex(p => p.id === newPhoto.id);
                        if (index !== -1) {
                          photosRef.current.splice(index, 1);
                        }
                        duplicateCount++;
                        successCount--;
                        updateProgress();
                        return; // Accept this as a handled case
                      }

                      console.error(`[usePhotoImport] Error saving photo ${newPhoto.id} to cloud:`, e);
                      
                      // Rollback: Remove failed photo from UI
                      const index = photosRef.current.findIndex(p => p.id === newPhoto.id);
                      if (index !== -1) {
                        photosRef.current.splice(index, 1);
                      }
                      showError(e, `上传照片失败: ${newPhoto.name}`);
                      invalidatePhotos();
                      updateProgress();
                      throw e; // Rethrow to ensure Promise.allSettled marks task as rejected
                    })
                );
            }
          }
        } catch (err) {
          console.error(`[usePhotoImport] Error processing file ${file.name}:`, err);
          showError(err, `处理文件失败: ${file.name}`);
          failCount++;
          failedFiles.push(file.name);
          updateProgress();
        }
      } 
      
      // Await all background tasks (AI/Uploads)
      console.log(`[usePhotoImport] Awaiting ${tasks.length} background tasks...`);
      const results = await Promise.allSettled(tasks);
      invalidatePhotos();
      console.log(`[usePhotoImport] All background tasks finished. Results:`, results);

      // Check for failures in tasks themselves
      results.forEach((res, idx) => {
        if (res.status === 'rejected') {
          failCount++;
          // We don't have easy access to the filename here, but we can log it
          console.error(`[usePhotoImport] Task ${idx} failed:`, res.reason);
          failedFiles.push(`后台任务 ${idx + 1}`);
        }
      });

      saveData('product_photos', photosRef.current).catch(err => {
        console.error("Failed to save photos to indexedDB", err);
      });
      setIsSyncing(false);
      
      let notificationMsg = `上传完成：成功 ${successCount - failCount} 张，跳过 ${duplicateCount} 张`;
      if (duplicateCount > 0) {
        notificationMsg += '（已存在相同照片）';
      }
      if (failCount > 0) {
        notificationMsg += `，失败 ${failCount} 张。`;
        showError(new Error(`详情: ${failedFiles.slice(0, 3).join(', ')}${failedFiles.length > 3 ? '...' : ''} 请查看控制台`), notificationMsg);
      } else {
        showSuccess(notificationMsg);
      }

    });
  };

  return { handlePhotoImport, importProgress, importTotal };
};
