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
import { useInvalidatePhotos, useFeedback, useTaskExecutor } from '@/hooks';
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
  const { runTask } = useTaskExecutor();
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

    // Wrap the entire import process in runTask for consistency and robustness
    await runTask(`导入 ${sFileArray.length} 张照片`, async ({ updateProgress }) => {
        importCancelledRef.current = false;
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;
        
        setIsSyncing(true);
        setActiveScreen('home');

        let successCount = 0;
        let duplicateCount = 0;
        let failCount = 0;
        const failedFiles: string[] = [];

        let lastProgressAt = Date.now();
        const STALL_TIMEOUT = 90000; // 90 seconds stall timeout

        const workflowProps = {
            user, geminiApiKey, aiProvider, customModel, categories, 
            tags, manufacturers, tagNameToIdMap, photosRef, queryClient
        };

        for (let i = 0; i < sFileArray.length; i++) {
            if (importCancelledRef.current || signal.aborted) break;
            
            // Stalled detection check
            if (Date.now() - lastProgressAt > STALL_TIMEOUT) {
                throw new Error('导入长时间无进度，已自动中止');
            }

            const file = sFileArray[i];
            try {
                const { hash, dataUrl } = await getHashAndDataUrl(file);
                if (importCancelledRef.current || signal.aborted) break;

                if (await isDuplicate(hash)) {
                    duplicateCount++;
                    lastProgressAt = Date.now(); // Update progress
                } else {
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

                    if (useAi) {
                        try {
                            await processAiAnalysis(newPhoto, workflowProps, signal, true, () => {}, invalidatePhotos);
                        } catch (err: any) {
                          if (err.name === 'DuplicatePhotoError') {
                            const idx = photosRef.current.findIndex(p => p.id === newPhoto.id);
                            if (idx !== -1) photosRef.current.splice(idx, 1);
                            duplicateCount++;
                            successCount--;
                          } else {
                            throw err;
                          }
                        }
                    }
                    lastProgressAt = Date.now(); // Update progress
                }
            } catch (err) {
                if (importCancelledRef.current || signal.aborted) break;
                console.error(`导入单项失败: ${file.name}`, err);
                failCount++;
                failedFiles.push(file.name);
            }
            
            const pct = Math.floor(((i + 1) / sFileArray.length) * 100);
            updateProgress(pct, `处理中 ${i + 1}/${sFileArray.length}`);
        }
        
        invalidatePhotos();
        saveData('product_photos', photosRef.current).catch(e => console.error('存入本地失败', e));
        setIsSyncing(false);
        
        if (failCount > 0) {
            throw new Error(`导入完成：成功 ${successCount - failCount}，跳过 ${duplicateCount}，失败 ${failCount}: ${failedFiles.slice(0, 3).join(', ')}`);
        }
    }, { showSuccessToast: true });
  }, [
    user, geminiApiKey, aiProvider, customModel, categories, tags, manufacturers, 
    tagNameToIdMap, photosRef, queryClient, invalidatePhotos, showSuccess,
    setIsSyncing, setActiveScreen, getHashAndDataUrl, isDuplicate, sessionHashes, runTask
  ]);

  return { handlePhotoImport, importProgress, importTotal };
};
