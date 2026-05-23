import { useState, useRef, useMemo, useCallback } from 'react';
import { User, Photo, Category, Tag, Manufacturer } from '@/types';
import { 
  savePhotoToCloud
} from '@/services/photoService';
import { generateItemCode } from '@/services/utils';
import { formatDate } from '@/utils/dateFormat';
import { saveData } from '@/utils/indexedDB';
import { safeArray } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useInvalidatePhotos, useFeedback } from '@/hooks';
import { useImageHash } from '@/hooks/useImageHash';
import { useDuplicateCheck } from '@/hooks/useDuplicateCheck';
import { processSinglePhoto as processAiAnalysis } from '@/hooks/photoAi/usePhotoAI';

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

  const importCancelledRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const sessionHashes = useMemo(() => new Set<string>(), []);
  const { getHashAndDataUrl } = useImageHash();
  const { isDuplicate } = useDuplicateCheck(photosRef, sessionHashes, user);

  const { setIsSyncing = () => {} } = adminSession || {};
  const { setActiveScreen = () => {} } = adminUI || {};

  const handlePhotoImport = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList | null } },
    useAi: boolean
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const sFileArray = safeArray(Array.from(files));
    
    if (sFileArray.some(f => f.name.toLowerCase().endsWith('.heic') || f.type === 'image/heic')) {
      showSuccess('检测到 HEIC 照片，建议转换后再上传');
    }

    importCancelledRef.current = false;
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    return runWithLoading('importing', async () => {
      setIsSyncing(true);
      setImportTotal(sFileArray.length);
      setImportProgress(0);
      setActiveScreen('home');

      let successCount = 0;
      let duplicateCount = 0;
      let failCount = 0;
      const failedFiles: string[] = [];

      const handleCancelImport = () => {
        importCancelledRef.current = true;
        abortControllerRef.current?.abort();
        abortAnalysis();
        [uploadTaskId, aiTaskId].filter(Boolean).forEach(id => {
          updateTask(id, { status: 'cancelled', message: '用户已取消', finished_at: Date.now() });
        });
      };

      const uploadTaskId = addTask({
        name: `上传照片 (${sFileArray.length} 张)`,
        status: 'running',
        progress: 0,
        onCancel: handleCancelImport
      });

      const aiTaskId = useAi ? addTask({
        name: `AI 识别 (${sFileArray.length} 张)`,
        status: 'running',
        onCancel: handleCancelImport
      }) : '';

      let processedCount = 0;
      const onProgressUpdate = () => {
        if (importCancelledRef.current) return;
        processedCount++;
        const progress = (processedCount / sFileArray.length) * 100;
        const msg = `${processedCount}/${sFileArray.length}...`;
        
        if (uploadTaskId) updateTask(uploadTaskId, { progress, message: `正在上传 ${msg}`, status: processedCount === sFileArray.length ? 'completed' : 'running' });
        if (aiTaskId) updateTask(aiTaskId, { progress, message: `正在识别 ${msg}`, status: processedCount === sFileArray.length ? 'completed' : 'running' });
      };

      const workflowProps = {
        user, geminiApiKey, aiProvider, customModel, categories, 
        tags, manufacturers, tagNameToIdMap, photosRef, queryClient
      };

      const tasks: Promise<void>[] = [];

      for (const file of sFileArray) {
        if (importCancelledRef.current || signal.aborted) break;
        
        try {
          const { hash, dataUrl } = await getHashAndDataUrl(file);
          if (importCancelledRef.current || signal.aborted) break;

          if (await isDuplicate(hash)) {
            duplicateCount++;
            onProgressUpdate();
            continue;
          }

          sessionHashes.add(hash);
          const newPhoto = {
            id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            storage_id: hash, 
            item_code: generateItemCode(),
            manual_code: '',
            image_hash: hash,
            name: file.name.split('.')[0] || '未命名产品',
            description: '',
            image_url: '',
            uri: dataUrl,
            category_id: null,
            manufacturer_id: null,
            tag_ids: [],
            created_at: formatDate(new Date()),
            group_id: null,
            is_analyzing: useAi,
            is_hidden: false,
            _fileName: file.name,
            _fileSize: file.size,
            _lastModified: file.lastModified
          } as any;
          
          successCount++;
          photosRef.current.push(newPhoto);

          tasks.push(processAiAnalysis(newPhoto, workflowProps, signal, useAi, onProgressUpdate, invalidatePhotos)
            .catch(err => {
              if (err.name === 'DuplicatePhotoError') {
                const idx = photosRef.current.findIndex(p => p.id === newPhoto.id);
                if (idx !== -1) photosRef.current.splice(idx, 1);
                duplicateCount++;
                successCount--;
                return;
              }
              throw err;
            })
          );
        } catch (err) {
          if (importCancelledRef.current || signal.aborted) break;
          showError(err, `处理失败: ${file.name}`);
          failCount++;
          failedFiles.push(file.name);
          onProgressUpdate();
        }
      } 
      
      const results = await Promise.allSettled(tasks);
      invalidatePhotos();

      results.forEach((res, idx) => {
        if (res.status === 'rejected') {
          failCount++;
          showError(res.reason, `后台任务 ${idx + 1} 执行失败`);
          failedFiles.push(`后台任务 ${idx + 1}`);
        }
      });

      saveData('product_photos', photosRef.current).catch(e => showError(e, '存入本地失败'));
      setIsSyncing(false);
      
      const msg = `上传完成：成功 ${successCount - failCount}，跳过 ${duplicateCount}`;
      if (failCount > 0) {
        showError(new Error(`失败详情: ${failedFiles.slice(0, 3).join(', ')}`), msg);
      } else {
        showSuccess(msg);
      }
    });
  }, [
    user, geminiApiKey, aiProvider, customModel, categories, tags, manufacturers, 
    setCloudCount, addManufacturer, runWithLoading, addTask, updateTask, abortAnalysis, 
    tagNameToIdMap, photosRef, showError, queryClient, invalidatePhotos, showSuccess,
    setIsSyncing, setActiveScreen, getHashAndDataUrl, isDuplicate, sessionHashes
  ]);

  return { handlePhotoImport, importProgress, importTotal };
};
