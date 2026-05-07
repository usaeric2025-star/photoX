import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import { GalleryProvider } from './context/GalleryContext';
import { ErrorProvider, showSystemError } from './context/ErrorContext';
import { TaskProvider } from './hooks/useTasks';
import { AdminUIProvider, AdminSessionProvider } from './context/AdminContexts';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useState } from 'react';
import './index.css';

window.onerror = function(msg, src, line, col, error) {
  // Append to local error log so it shows up in ErrorLogViewer
  showSystemError(`[Global] ${msg} (at ${line}:${col})`);
  
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:red;color:white;font-size:11px;padding:8px;z-index:99999;word-break:break-all;white-space:pre-wrap';
  div.innerText = `ERR: ${msg}\nLine: ${line}\n${error?.stack?.slice(0, 400) || ''}`;
  document.body.appendChild(div);
};

window.onunhandledrejection = function(e) {
  const reason = String(e.reason?.message || e.reason);
  showSystemError(`[Promise] ${reason}`);

  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:orange;color:white;font-size:11px;padding:8px;z-index:99999;word-break:break-all;white-space:pre-wrap';
  div.innerText = `PROMISE ERR: ${String(e.reason?.stack || e.reason).slice(0, 400)}`;
  document.body.appendChild(div);
};

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
  </StrictMode>,
);
