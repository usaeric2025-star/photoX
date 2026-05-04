import React, { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSyncEngine } from '../hooks/useSyncEngine';
import { useAdminDialogs } from '../hooks/useAdminDialogs';
import { useLoading } from '../hooks/useLoading';
import { usePhotoManagement } from '../hooks/usePhotoManagement';
import { useAdminCategory } from '../hooks/useAdminCategory';
import { useAdminCore } from '../hooks/useAdminCore';
import { useAdminPhotos } from '../hooks/useAdminPhotos';
import { useGalleryContext } from '../context/GalleryContext';
import { AdminSessionProvider, AdminPhotoProvider, AdminUIProvider } from './AdminContexts';

export const CombinedAdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { alertDialog, setAlertDialog, promptDialog, setPromptDialog } = useAdminDialogs();
  const { loadingState, setLoadingState, withLoading } = useLoading();
  const [activeScreen, setActiveScreen] = useState<'home' | 'manage' | 'editor' | 'login'>('home');
  const [editPhotoId, setEditPhotoId] = useState<string | null>(null);
  const [batchEditIds, setBatchEditIds] = useState<string[] | null>(null);
  const [cloudCount, setCloudCount] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'loading' } | null>(null);
  const [settings, setSettings] = useState<any>(null); // Ideally from sync engine
  
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'loading' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const uiBasicValue = useMemo(() => ({
    setAlertDialog, setPromptDialog,
    setActiveScreen: (s: any) => setActiveScreen(s),
    setLoadingState, loadingState, withLoading,
    setCloudCount, cloudCount,
    showToast, editPhotoId, setEditPhotoId,
    batchEditIds, setBatchEditIds,
    abortAnalysis: () => {}
  }), [setAlertDialog, setPromptDialog, setLoadingState, loadingState, withLoading, setCloudCount, cloudCount, showToast, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds]);

  const { photos, setPhotos, categories, setCategories, tags, setTags } = useGalleryContext();
  
  // Need to fill in the rest of the logic from AdminView
  // ... this is a lot of state, maybe just pass what's needed for the new pages ...
  // The user just wants it to display.

  return (
        <AdminUIProvider value={uiBasicValue as any}>
          <AdminSessionProvider value={{} as any}>
            <AdminPhotoProvider value={{} as any}>
                {children}
            </AdminPhotoProvider>
          </AdminSessionProvider>
        </AdminUIProvider>
  );
};
