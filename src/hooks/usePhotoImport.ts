import { useState, useRef } from 'react';
import { toast } from 'sonner';
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
  adminUI: any,
  adminSession: any,
  geminiApiKey: string | undefined,
  aiProvider: string,
  customModel: string,
  categories: Category[],
  tags: Tag[],
  manufacturers: Manufacturer[],
  setCloudCount: (c: number | null) => void,
  addManufacturer: (name: string) => Promise<Manufacturer>,
  runWithLoading: <T>(state: any, fn: () => Promise<T>) => Promise<T>,
  addTask: (task: any) => string,
  updateTask: (id: string, updates: any) => void,
  abortAnalysis: () => void,
  tagNameToIdMap: Map<string, string>,
  photosRef: React.MutableRefObject<Photo[]>,
  handleError: (error: any, context?: string) => void
) => {
  const queryClient = useQueryClient();
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
      toast.info('检测到 HEIC 格式照片，建议转换为 JPG 后上传 / HEIC detected, conversion recommended');
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

      for (let i = 0; i < sFileArray.length; i++) {
        const file = sFileArray[i];
        setImportProgress(i + 1);
        
        try {
          const { hash, dataUrl } = await processImageFile(file);

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
            isAnalyzing: !!useAi
          };
          
          successCount++;
          
          if (useAi) {
            (async (targetId: string, targetUri: string, initialPhoto: Photo) => {
               try {
                 const apiKey = geminiApiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
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
                 
                 if (user) {
                   await savePhotoToCloud(user.id, updated);
                   queryClient.invalidateQueries({ queryKey: ['photos'] });
                   queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
                 }
               } catch (err) {
                 queryClient.invalidateQueries({ queryKey: ['photos'] });
               } finally {
                 updateAiProgress();
               }
            })(photoId, dataUrl, newPhoto);
          } else if (user) {
            savePhotoToCloud(user.id, newPhoto).then(() => {
              queryClient.invalidateQueries({ queryKey: ['photos'] });
            }).catch(e => handleError(e, "云端同步失败"));
          }
        } catch (err) {
          handleError(err, `处理文件失败: ${file.name}`);
          failCount++;
          failedFiles.push(file.name);
        }
      } 
      
      saveData('product_photos', photosRef.current);
      setCloudCount(photosRef.current.length);
      setIsSyncing(false);
      
      if (successCount > 0 || duplicateCount > 0 || failCount > 0) {
         let msg = `已处理 ${successCount} 张照片。`;
         if (duplicateCount > 0) msg += ` 跳过 ${duplicateCount} 张重复。`;
         if (failCount > 0) msg += ` ${failCount} 张失败。`;
         
         if (successCount > 0) toast.success(msg);
         else toast.error(msg);
      }
    });
  };

  return { handlePhotoImport, importProgress, importTotal };
};
