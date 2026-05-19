import { useState, useRef, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useErrorHandler } from '../utils/errorHandler';
import { useDelete } from './useDelete';
import { Photo, User, Manufacturer, Category, Tag } from '../types';
import { translateDescription } from '../services/geminiService';
import { saveData } from '../utils/indexedDB';
import { useGalleryStore } from '../store';
import { useTasks } from './useTasks';

// Import new hooks
import { usePhotoImport } from './usePhotoImport';
import { usePhotoAI } from './usePhotoAI';
import { usePhotoMutations } from './usePhotoMutations';
import { useGroupPhotosMutation } from './mutations/useGroupOperations';
import { safeArray } from '../lib/utils';

export const useAdminPhotos = (
  user: User | null, 
  geminiApiKey: string | undefined, 
  aiProvider: string, 
  customModel: string,
  data: {
    photos: Photo[];
    categories: Category[];
    tags: Tag[];
    manufacturers: Manufacturer[];
  },
  adminUI?: {
    cloudCount: number | null;
    setCloudCount: (c: number | null) => void;
    loadingState?: string;
    setLoadingState?: (s: string) => void;
    setAlertDialog: (d: import('../types').DialogData | null) => void;
    setActiveScreen: (s: 'home' | 'manage' | 'login') => void;
    abortAnalysis: () => void;
    withLoading?: <T>(state: string, fn: () => Promise<T>) => Promise<T>;
  },
  adminSession?: {
    setIsSyncing: (v: boolean) => void;
  },
  addManufacturer?: (name: string) => Promise<Manufacturer>
) => {
  const { photos, categories, tags, manufacturers } = data;

  const tagIdToNameMap = tags.reduce((acc, tag) => {
    acc[tag.id] = tag.name;
    return acc;
  }, {} as Record<string, string>);

  const tagNameToIdMap = tags.reduce((acc, tag) => {
    acc.set(tag.name.toLowerCase(), tag.id);
    if ((tag as any).zh) acc.set((tag as any).zh.toLowerCase(), tag.id);
    if ((tag as any).aliases) (tag as any).aliases.forEach((a: string) => acc.set(a.toLowerCase(), tag.id));
    return acc;
  }, new Map<string, string>());
  const { handleError } = useErrorHandler();
  const { deletePhotos } = useDelete();
  const { tasks, addTask, updateTask, removeTask } = useTasks();
  const { setLoadingState: uiSetLoadingState } = adminUI || {};
  
  const [internalCloudCount, setInternalCloudCount] = useState<number | null>(null);
  const cloudCount = adminUI?.cloudCount ?? internalCloudCount;
  const setCloudCount = adminUI?.setCloudCount || setInternalCloudCount;

  const [internalLoadingState, setInternalLoadingState] = useState<string>('idle');
  const currentLoadingState = adminUI?.loadingState !== undefined ? adminUI.loadingState : internalLoadingState;
  const setLoadingState = uiSetLoadingState || setInternalLoadingState;

  const runWithLoading = async <T,>(state: string, fn: () => Promise<T>): Promise<T> => {
      if (adminUI?.withLoading) {
          return adminUI.withLoading(state, fn);
      }
      setLoadingState(state);
      try {
          return await fn();
      } finally {
          setLoadingState('idle');
      }
  };

  const photosRef = useRef(photos);
  
  useEffect(() => {
    photosRef.current = photos;
    saveData('product_photos', photos);
  }, [photos]);

  // Handle AI Resume
  useEffect(() => {
    const sPhotos = safeArray(photos);
    if (sPhotos.length > 0) {
      const runningBatchTask = tasks.find(t => t.status === 'running' && t.name.includes('批量 AI 识别'));
      if (runningBatchTask && !aiHook.aiDebugInfo) {
        aiHook.handleBatchAiIdentify(sPhotos, runningBatchTask.id);
      }
    }
  }, [safeArray(photos).length]);

  // 1. Initialize Photo AI Hook
  const aiHook = usePhotoAI(
    user, geminiApiKey, aiProvider, customModel, 
    categories, tags, manufacturers, 
    tagNameToIdMap, 
    addTask, updateTask, removeTask,
    photosRef,
    handleError
  );

  // 2. Initialize Photo Import Hook
  const importHook = usePhotoImport(
    user, adminUI, adminSession, geminiApiKey, aiProvider, customModel,
    categories, tags, manufacturers,
    setCloudCount, addManufacturer!,
    runWithLoading, addTask, updateTask, aiHook.abortAnalysis,
    tagNameToIdMap, photosRef,
    handleError
  );

  // 3. Initialize Photo Mutations Hook
  const mutationHook = usePhotoMutations(
    user, handleError, deletePhotos, photosRef,
    addTask, updateTask, removeTask
  );

  const { mutateAsync: groupPhotosMutation } = useGroupPhotosMutation();

  return useMemo(() => ({
    // Photos & Basic State
    photos,
    isImporting: currentLoadingState === 'importing',
    cloudCount, setCloudCount,
    
    // Import Hook
    handlePhotoImport: importHook.handlePhotoImport,
    importProgress: importHook.importProgress,
    importTotal: importHook.importTotal,
    
    // AI Hook
    handleSingleAiAnalyze: aiHook.handleSingleAiAnalyze,
    handleBatchAiIdentify: aiHook.handleBatchAiIdentify,
    handleGroupAiIdentify: aiHook.handleGroupAiIdentify,
    aiDebugInfo: aiHook.aiDebugInfo,
    setAiDebugInfo: aiHook.setAiDebugInfo,
    batchProgress: aiHook.batchProgress,
    abortAnalysis: aiHook.abortAnalysis,
    handleTranslate: async (zhText: string) => {
      const apiKey = geminiApiKey;
      if (!apiKey) throw new Error('请先在设置中设定 AI 密钥');
      return await translateDescription(zhText, apiKey, customModel);
    },

    // Mutation Hook
    handleGroupPhotos: groupPhotosMutation,
    deletePhoto: mutationHook.deletePhoto,
    updatePhoto: mutationHook.updatePhoto,
    updatePhotosBulk: mutationHook.updatePhotosBulk
  }), [
    photos, currentLoadingState, cloudCount, setCloudCount,
    importHook.handlePhotoImport, importHook.importProgress, importHook.importTotal,
    aiHook.handleSingleAiAnalyze, aiHook.handleBatchAiIdentify, aiHook.handleGroupAiIdentify,
    aiHook.aiDebugInfo, aiHook.setAiDebugInfo, aiHook.batchProgress, aiHook.abortAnalysis,
    geminiApiKey, customModel, groupPhotosMutation, mutationHook.deletePhoto, 
    mutationHook.updatePhoto, mutationHook.updatePhotosBulk
  ]);
};
