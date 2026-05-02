import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import AppRoutes from './AppRoutes';
import { GalleryProvider } from './context/GalleryContext';
import { ErrorProvider } from './context/ErrorContext';
import { TaskProvider } from './hooks/useTasks';
import { AdminUIProvider, AdminSessionProvider } from './context/AdminContexts';
import { useState } from 'react';
import './index.css';

const RootAdminUIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alertDialog, setAlertDialog] = useState<any>(null);
  const [promptDialog, setPromptDialog] = useState<any>(null);
  const [activeScreen, setActiveScreen] = useState('home');
  const [editPhotoId, setEditPhotoId] = useState<string | null>(null);
  const [batchEditIds, setBatchEditIds] = useState<string[] | null>(null);
  const [toast, setToast] = useState<any>(null);
  const [loadingState, setLoadingState] = useState<'idle' | 'syncing' | 'analyzing' | 'importing' | 'compressing' | 'uploading' | 'saving' | 'deleting'>('idle');
  const [batchProgress] = useState({ current: 0, total: 0 });
  const [aiDebugInfo] = useState<any>(null);
  
  const showToast = (message: string, type: 'success' | 'error') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };
  const withLoading = async <T,>(state: any, fn: () => Promise<T>) => { setLoadingState(state); try { return await fn(); } finally { setLoadingState('idle'); } };

  const value = {
    activeScreen, setActiveScreen, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds,
    alertDialog, setAlertDialog, promptDialog, setPromptDialog,
    toast, showToast,
    loadingState, setLoadingState, withLoading, batchProgress, aiDebugInfo, 
    abortAnalysis: () => console.log('abort'), isAnalyzing: false 
  };

  return <AdminUIProvider value={value as any}>{children}</AdminUIProvider>;
};

const RootAdminSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<any>({});
  
  const value = {
    user: null, // Should be lifted from top-level auth, if applicable
    isAdminMode: false,
    settings,
    setSettings,
    geminiApiKey: '',
    setGeminiApiKey: () => {},
    internalPassword: '',
    setInternalPassword: () => {},
    customModel: '',
    setCustomModel: () => {},
    viewMode: 'public',
    setViewMode: () => {},
    syncPercent: 0,
    setSyncPercent: () => {},
    loginWithGoogle: async () => {},
    logout: () => {},
    appLang: 'zh'
  };
  return <AdminSessionProvider value={value as any}>{children}</AdminSessionProvider>;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorProvider>
      <GalleryProvider>
        <TaskProvider>
          <RootAdminUIProvider>
             <RootAdminSessionProvider>
                <AppRoutes />
             </RootAdminSessionProvider>
          </RootAdminUIProvider>
        </TaskProvider>
      </GalleryProvider>
    </ErrorProvider>
  </StrictMode>,
);
