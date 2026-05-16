import React, {StrictMode, useState} from 'react';
import {createRoot} from 'react-dom/client';
import { Toaster, toast } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { GalleryProvider } from './context/GalleryContext';
import { ErrorProvider, showSystemError } from './context/ErrorContext';
import { TaskProvider } from './hooks/useTasks';
import { AdminUIProvider, AdminSessionProvider } from './context/AdminContexts';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';


const RootAdminUIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alertDialog, setAlertDialog] = useState<any>(null);
  const [promptDialog, setPromptDialog] = useState<any>(null);
  const [activeScreen, setActiveScreen] = useState('home');
  const [editPhotoId, setEditPhotoId] = useState<string | null>(null);
  const [batchEditIds, setBatchEditIds] = useState<string[] | null>(null);
  const [loadingState, setLoadingState] = useState<'idle' | 'syncing' | 'analyzing' | 'importing' | 'compressing' | 'uploading' | 'saving' | 'deleting'>('idle');
  const [batchProgress] = useState({ current: 0, total: 0 });
  const [aiDebugInfo] = useState<any>(null);
  
  const withLoading = async <T,>(state: any, fn: () => Promise<T>) => { setLoadingState(state); try { return await fn(); } finally { setLoadingState('idle'); } };

  const value = {
    activeScreen, setActiveScreen, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds,
    alertDialog, setAlertDialog, promptDialog, setPromptDialog,
    loadingState, setLoadingState, withLoading, batchProgress, aiDebugInfo, 
    abortAnalysis: () => console.log('abort'), isAnalyzing: false 
  };

  return <AdminUIProvider value={value as any}>{children}</AdminUIProvider>;
};

const RootAdminSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<any>({});
  
  const value = {
    user: null, 
    isAdminMode: false,
    settings,
    setSettings,
    geminiApiKey: '',
    setGeminiApiKey: () => {},
    accessPasscode: '',
    setAccessPasscode: () => {},
    customModel: '',
    setCustomModel: () => {},
    viewMode: 'public',
    setViewMode: () => {},
    isSyncing: false,
    setIsSyncing: () => {},
    onRefresh: async () => {},
    loginWithGoogle: async () => {},
    logout: () => {},
    appLang: 'zh'
  };
  return <AdminSessionProvider value={value as any}>{children}</AdminSessionProvider>;
};


declare global {
  interface Window {
    __debugInject: any;
  }
}


// Global error logging
window.onerror = (message, source, lineno, colno, error) => {
  showSystemError(`Unhandled Error: ${message} at ${source}:${lineno}:${colno}`);
  return false;
};

window.onunhandledrejection = (event) => {
  showSystemError(`Unhandled Promise Rejection: ${event.reason}`);
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" richColors closeButton />
      <ErrorProvider>
        <ErrorBoundary>
          <GalleryProvider>
            <TaskProvider>
              <RootAdminUIProvider>
                 <RootAdminSessionProvider>
                    <App />
                 </RootAdminSessionProvider>
              </RootAdminUIProvider>
            </TaskProvider>
          </GalleryProvider>
        </ErrorBoundary>
      </ErrorProvider>
    </QueryClientProvider>
  </StrictMode>,
);
