import { Suspense, lazy } from 'react';
import { motion } from 'lite-sleek';
import { AppErrorBoundary } from './components/layout/AppErrorBoundary.js';
import { ConfirmProvider } from './context/ConfirmContext.js';

import { LoadingScreen } from './components/ui/LoadingScreen.js';
import { Toaster } from 'sonner';
import { useAtomValue } from 'jotai';
import { authLoadingAtom, authInitializedAtom, appErrorAtom } from './store/index.js';
import { RouterProvider } from 'react-router-dom';
import { router } from './router.js';

export default function App() {
  const isAuthLoading = useAtomValue(authLoadingAtom);
  const isAuthInitialized = useAtomValue(authInitializedAtom);
  const appError = useAtomValue(appErrorAtom) as Error | null;

  return (
    <AppErrorBoundary>
      <ConfirmProvider>
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
              <RouterProvider router={router} />
            </Suspense>
          </motion.div>
        )}
      </ConfirmProvider>
      <Toaster position="top-right" closeButton visibleToasts={3} />
    </AppErrorBoundary>
  );
}
