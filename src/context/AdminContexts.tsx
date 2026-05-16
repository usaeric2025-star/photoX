import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Photo, Category, Tag, ProductFormData, User, AppSettings, Manufacturer, ApiResponse } from '../types';

// --- AdminSessionContext ---
export interface AdminSessionContextType {
  user: User | null;
  isAdminMode: boolean;
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
  geminiApiKey: string;
  setGeminiApiKey: (k: string) => void;
  accessPasscode: string;
  setAccessPasscode: (p: string) => void;
  customModel: string;
  setCustomModel: (m: string) => void;
  viewMode: 'public' | 'private';
  setViewMode: (v: 'public' | 'private') => void;
  isSyncing: boolean;
  setIsSyncing: (v: boolean) => void;
  onRefresh: () => Promise<void>;
  loginWithGoogle: () => Promise<any>;
  logout: () => void;
  appLang: string;
  isStaffMode?: boolean;
}

const AdminSessionContext = createContext<AdminSessionContextType | undefined>(undefined);

export const AdminSessionProvider: React.FC<{ children: ReactNode, value: AdminSessionContextType }> = ({ children, value }) => (
  <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>
);

export const useAdminSession = () => {
  const context = useContext(AdminSessionContext);
  if (!context) throw new Error('useAdminSession must be used within AdminSessionProvider');
  return context;
};

export const useOptionalAdminSession = () => useContext(AdminSessionContext);

// --- AdminPhotoContext ---
export interface AdminPhotoContextType {
  // Data lists
  photos: Photo[];
  categories: Category[];
  tags: Tag[];
  manufacturers: Manufacturer[];
  
  // Method references
  handleSingleAiAnalyze: (data: string, catId?: string, editPhotoId?: string | null) => Promise<any>;
  handleTranslate: (zhText: string) => Promise<{ en: string, ms: string }>;
  handleSingleAiAnalyzeCallback?: (data: string, catId?: string, editPhotoId?: string, formState?: ProductFormData, updateFormFn?: (updates: Partial<ProductFormData>) => void, service?: any) => Promise<ApiResponse>;
  handleBatchAiIdentify: (photos: Photo[], existingTaskId?: string) => Promise<void>;
  handleGroupAiIdentify: (photos: Photo[]) => Promise<void>;
  handlePhotoImport: (e: React.ChangeEvent<HTMLInputElement>, isGroup: boolean) => Promise<void>;
  deletePhoto: (ids: string | string[]) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<ApiResponse>;
  handleGroupPhotos: (ids: string[]) => Promise<ApiResponse>;
  handleUngroup: (groupId: string) => Promise<ApiResponse>;
  saveNewPhoto: () => Promise<void>;
  saveBatchEdit: () => Promise<void>;
  updatePhoto: (id: string, updates: Partial<Photo>) => Promise<void>;
  updatePhotosBulk: (ids: string[], updates: Partial<Photo>, taskName?: string) => Promise<void>;
  updateTag: (id: string, name: string) => Promise<any>;
  deleteTag: (id: string) => Promise<any>;
  addTag: (name: string) => Promise<Tag>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<any>;
  deleteCategory: (id: string) => Promise<any>;
  addCategory: (name: string) => Promise<any>;
  addManufacturer: (name: string) => Promise<Manufacturer>;
  updateManufacturer: (id: string, name: string) => Promise<any>;
  deleteManufacturer: (id: string) => Promise<any>;
  removeTagFromPhoto: (photoId: string, tagId: string) => Promise<void>;
  quickAddTag: () => void;
  quickAddManufacturer: () => void;
}

const AdminPhotoContext = createContext<AdminPhotoContextType | undefined>(undefined);

export const AdminPhotoProvider: React.FC<{ children: ReactNode, value: AdminPhotoContextType }> = ({ children, value }) => (
  <AdminPhotoContext.Provider value={value}>{children}</AdminPhotoContext.Provider>
);

export const useAdminPhoto = () => {
  const context = useContext(AdminPhotoContext);
  if (!context) throw new Error('useAdminPhoto must be used within AdminPhotoProvider');
  return context;
};

export const useOptionalAdminPhoto = () => useContext(AdminPhotoContext);

// --- AdminUIContext ---
export interface AdminUIContextType {
  activeScreen: 'home' | 'manage' | 'login';
  setActiveScreen: (s: 'home' | 'manage' | 'login') => void;
  editPhotoId: string | null;
  setEditPhotoId: (id: string | null) => void;
  batchEditIds: string[] | null;
  setBatchEditIds: (ids: string[] | null) => void;
  
  alertDialog: { 
    title: string, 
    message: string | React.ReactNode, 
    onConfirm?: () => void | Promise<void>, 
    onCancel?: () => void, 
    confirmLabel?: string, 
    cancelLabel?: string,
    type?: 'danger' | 'info',
    secondaryAction?: { 
      label: string, 
      onClick: () => void | Promise<void>, 
      type?: 'danger' | 'default' 
    }
  } | null;
  setAlertDialog: (d: { 
    title: string, 
    message: string | React.ReactNode, 
    onConfirm?: () => void | Promise<void>, 
    onCancel?: () => void, 
    confirmLabel?: string, 
    cancelLabel?: string,
    type?: 'danger' | 'info',
    secondaryAction?: { 
      label: string, 
      onClick: () => void | Promise<void>, 
      type?: 'danger' | 'default' 
    }
  } | null) => void;
  promptDialog: { title: string, message?: string, placeholder?: string, onSubmit: (val: string) => void } | null;
  setPromptDialog: (d: { title: string, message?: string, placeholder?: string, onSubmit: (val: string) => void } | null) => void;
  
  loadingType: 'idle' | 'sync-pull' | 'sync-push' | 'analyzing' | 'importing' | 'compressing' | 'uploading' | 'saving' | 'deleting' | null;
  setLoadingType: (s: 'idle' | 'sync-pull' | 'sync-push' | 'analyzing' | 'importing' | 'compressing' | 'uploading' | 'saving' | 'deleting' | null) => void;
  withLoading: <T>(state: 'idle' | 'sync-pull' | 'sync-push' | 'analyzing' | 'importing' | 'compressing' | 'uploading' | 'saving' | 'deleting', fn: () => Promise<T>) => Promise<T>;
  isAnalyzing: boolean;
  batchProgress: { current: number, total: number };
  aiDebugInfo: { step: string; message: string; error?: string } | null;
  setAiDebugInfo: (d: { step: string; message: string; error?: string } | null) => void;
  abortAnalysis: () => void;
  cloudCount: number | null;
  setCloudCount: (c: number | null) => void;
}

const AdminUIContext = createContext<AdminUIContextType | undefined>(undefined);

export const AdminUIProvider: React.FC<{ children: ReactNode, value: Omit<AdminUIContextType, 'loadingType' | 'setLoadingType' | 'withLoading' | 'isAnalyzing'> }> = ({ children, value }) => {
  const [loadingType, setLoadingType] = useState<AdminUIContextType['loadingType']>('idle');
  
  const withLoading = async <T,>(type: Exclude<AdminUIContextType['loadingType'], 'idle' | null>, fn: () => Promise<T>): Promise<T> => {
    setLoadingType(type);
    try {
      return await fn();
    } finally {
      setLoadingType('idle');
    }
  };

  return (
    <AdminUIContext.Provider value={{
      ...value,
      loadingType,
      setLoadingType,
      withLoading,
      isAnalyzing: loadingType === 'analyzing'
    } as AdminUIContextType}>
      {children}
    </AdminUIContext.Provider>
  );
};

export const useAdminUI = () => {
  const context = useContext(AdminUIContext);
  if (!context) throw new Error('useAdminUI must be used within AdminUIProvider');
  return context;
};

export const useOptionalAdminUI = () => useContext(AdminUIContext);
