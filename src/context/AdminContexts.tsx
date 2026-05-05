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
  internalPassword: string;
  setInternalPassword: (p: string) => void;
  customModel: string;
  setCustomModel: (m: string) => void;
  viewMode: 'public' | 'private';
  setViewMode: (v: 'public' | 'private') => void;
  isSyncing: boolean;
  setIsSyncing: (v: boolean) => void;
  onRefresh: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
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
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  tags: Tag[];
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>;
  manufacturers: Manufacturer[];
  setManufacturers: React.Dispatch<React.SetStateAction<Manufacturer[]>>;
  
  // Method references
  handleSingleAiAnalyze: (data: string, catId?: string) => Promise<any>;
  handleTranslate: (zhText: string) => Promise<{ en: string, ms: string }>;
  handleSingleAiAnalyzeCallback?: (data: string, catId?: string, editPhotoId?: string, formState?: ProductFormData, updateFormFn?: (updates: Partial<ProductFormData>) => void, service?: any) => Promise<ApiResponse>;
  handleBatchAiIdentify: (photos: Photo[], existingTaskId?: string) => Promise<void>;
  handleGroupAiIdentify: (photos: Photo[]) => Promise<void>;
  handlePhotoImport: (e: React.ChangeEvent<HTMLInputElement>, isGroup: boolean) => Promise<void>;
  deletePhoto: (ids: string[], isBatch: boolean) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<ApiResponse>;
  handleGroupPhotos: (ids: string[]) => Promise<ApiResponse>;
  handleUngroup: (groupId: string) => Promise<ApiResponse>;
  saveNewPhoto: () => Promise<void>;
  saveBatchEdit: () => Promise<void>;
  updateTag: (id: string, name: string) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  addTag: (name: string) => Promise<Tag>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  addManufacturer: (name: string) => Promise<Manufacturer>;
  updateManufacturer: (id: string, name: string) => Promise<void>;
  deleteManufacturer: (id: string) => Promise<void>;
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
  
  alertDialog: { title: string, message: string, onConfirm?: () => void, onCancel?: () => void, confirmLabel?: string, type?: 'danger' | 'info' } | null;
  setAlertDialog: (d: { title: string, message: string, onConfirm?: () => void, onCancel?: () => void, confirmLabel?: string, type?: 'danger' | 'info' } | null) => void;
  promptDialog: { title: string, message?: string, placeholder?: string, onSubmit: (val: string) => void } | null;
  setPromptDialog: (d: { title: string, message?: string, placeholder?: string, onSubmit: (val: string) => void } | null) => void;
  
  toast: { message: string, type: 'success' | 'error' | 'loading' | 'info' } | null;
  showToast: (msg: string, type: 'success' | 'error' | 'loading' | 'info') => void;
  
  loadingState: 'idle' | 'syncing' | 'analyzing' | 'importing' | 'compressing' | 'uploading' | 'saving' | 'deleting';
  withLoading: <T>(state: 'idle' | 'syncing' | 'analyzing' | 'importing' | 'compressing' | 'uploading' | 'saving' | 'deleting', fn: () => Promise<T>) => Promise<T>;
  isAnalyzing: boolean;
  batchProgress: { current: number, total: number };
  aiDebugInfo: { step: string; message: string; error?: string } | null;
  abortAnalysis: () => void;
}

const AdminUIContext = createContext<AdminUIContextType | undefined>(undefined);

export const AdminUIProvider: React.FC<{ children: ReactNode, value: AdminUIContextType }> = ({ children, value }) => (
  <AdminUIContext.Provider value={value}>{children}</AdminUIContext.Provider>
);

export const useAdminUI = () => {
  const context = useContext(AdminUIContext);
  if (!context) throw new Error('useAdminUI must be used within AdminUIProvider');
  return context;
};

export const useOptionalAdminUI = () => useContext(AdminUIContext);
