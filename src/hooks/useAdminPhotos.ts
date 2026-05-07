import { useState, useRef, useEffect } from 'react';
import { useErrorHandler } from '../utils/errorHandler';
import { useDelete } from './useDelete';
import { Photo, User, Manufacturer } from '../types';
import { translateDescription } from '../services/geminiService';
import { saveData } from '../utils/indexedDB';
import { useGalleryContext } from '../context/GalleryContext';
import { useTasks } from './useTasks';

// Import new hooks
import { usePhotoImport } from './usePhotoImport';
import { usePhotoAI } from './usePhotoAI';
import { usePhotoMutations } from './usePhotoMutations';
import { safeArray } from '../lib/utils';

export const useAdminPhotos = (
  user: User | null, 
  geminiApiKey: string | undefined, 
  aiProvider: string, 
  customModel: string,
  adminUI?: {
    cloudCount: number | null;
    setCloudCount: (c: number | null) => void;
    loadingState?: string;
    setAlertDialog: (d: any | null) => void;
    showToast: (msg: string, type?: 'success' | 'error' | 'loading' | 'info') => void;
    setActiveScreen: (s: 'home' | 'manage' | 'login') => void;
    abortAnalysis: () => void;
    withLoading?: <T>(state: any, fn: () => Promise<T>) => Promise<T>;
  },
  adminSession?: {
    setIsSyncing: (v: boolean) => void;
  },
  addManufacturer?: (name: string) => Promise<Manufacturer>
) => {
  const {
    photos, setPhotos,
    categories,
    tags, setTags, tagNameToIdMap,
    manufacturers
  } = useGalleryContext();

  const { handleError } = useErrorHandler();
  const { deletePhotos } = useDelete();
  const { tasks, addTask, updateTask } = useTasks();
  const { showToast = () => {} } = adminUI || {};
  
  const [internalCloudCount, setInternalCloudCount] = useState<number | null>(null);
  const cloudCount = adminUI?.cloudCount ?? internalCloudCount;
  const setCloudCount = adminUI?.setCloudCount || setInternalCloudCount;

  const [internalLoadingState, setInternalLoadingState] = useState<string>('idle');
  const currentLoadingState = adminUI?.loadingState !== undefined ? adminUI.loadingState : internalLoadingState;

  const runWithLoading = async <T,>(state: any, fn: () => Promise<T>): Promise<T> => {
      if (adminUI?.withLoading) {
          return adminUI.withLoading(state, fn);
      }
      setInternalLoadingState(state);
      try {
          return await fn();
      } finally {
          setInternalLoadingState('idle');
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
    setPhotos, setTags, tagNameToIdMap, 
    showToast, addTask, updateTask, runWithLoading, 
    photosRef
  );

  // 2. Initialize Photo Import Hook
  const importHook = usePhotoImport(
    user, adminUI, adminSession, geminiApiKey, aiProvider, customModel,
    categories, tags, manufacturers,
    setPhotos, setCloudCount, addManufacturer!,
    runWithLoading, showToast, addTask, updateTask, aiHook.abortAnalysis,
    tagNameToIdMap, setTags, photosRef
  );

  // 3. Initialize Photo Mutations Hook
  const mutationHook = usePhotoMutations(
    user, setPhotos, showToast, handleError, deletePhotos, photosRef
  );

  return {
    // Photos & Basic State
    photos, setPhotos,
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
    batchProgress: aiHook.batchProgress,
    abortAnalysis: aiHook.abortAnalysis,
    handleTranslate: async (zhText: string) => {
      const apiKey = geminiApiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
      if (!apiKey) throw new Error('请先在设置中设定 AI 密钥');
      return await translateDescription(zhText, apiKey, customModel);
    },

    // Mutation Hook
    deletePhoto: mutationHook.deletePhoto,
    updatePhoto: mutationHook.updatePhoto
  };
};
