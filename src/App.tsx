import { Suspense, lazy } from 'react';
import { motion } from 'lite-sleek';
import { AppErrorBoundary } from './components/layout/AppErrorBoundary.js';
import { ConfirmProvider } from './context/ConfirmContext.js';
import { GridProvider } from './context/GridContext.js';
import { RouterOrchestrator } from './components/RouterOrchestrator.js';
import { LoadingScreen } from './components/ui/LoadingScreen.js';
import { Toaster } from 'sonner';
import { useAtomValue } from 'jotai';
import { authLoadingAtom, appErrorAtom } from './store/index.js';

export default function App() {
  const isAuthLoading = useAtomValue(authLoadingAtom);
  const appError = useAtomValue(appErrorAtom) as Error | null;

  return (
    <AppErrorBoundary>
      <ConfirmProvider>
        <GridProvider>
          {isAuthLoading ? (
            <LoadingScreen />
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
