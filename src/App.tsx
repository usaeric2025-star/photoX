import { Suspense, lazy } from 'react';
import { motion } from 'lite-sleek';
import { AppErrorBoundary } from './components/layout/AppErrorBoundary.js';
import { ConfirmProvider } from './context/ConfirmContext.js';
import { GridProvider } from './context/GridContext.js';
import { RouterOrchestrator } from './components/RouterOrchestrator.js';
import { LoadingScreen } from './components/ui/LoadingScreen.js';
import { Toaster } from 'sonner';
import { useAtomValue } from 'jotai';
import { authLoadingAtom, authInitializedAtom, appErrorAtom } from './store/index.js';

export default function App() {
  const isAuthLoading = useAtomValue(authLoadingAtom);
  const isAuthInitialized = useAtomValue(authInitializedAtom);
  const appError = useAtomValue(appErrorAtom) as Error | null;

  return (
    <AppErrorBoundary>
      <ConfirmProvider>
        <GridProvider>
          {(!isAuthInitialized || isAuthLoading) ? (
            <LoadingScreen message="驗證身份与初始化中..." />
          ) : appError ? (
            <LoadingScreen error={appError} />
          ) : (
            <motion.div 
              variant="fade"
              transition="easeOut"
              className="relative min-h-screen"
            >
              <Suspense fallback={<LoadingScreen />}>
                <RouterOrchestrator />
              </Suspense>
            </motion.div>
          )}
        </GridProvider>
      </ConfirmProvider>
      <Toaster position="bottom-right" closeButton visibleToasts={3} />
    </AppErrorBoundary>
  );
}
