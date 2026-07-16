import { Suspense, lazy } from 'react';
import { motion } from 'lite-sleek';
import { AppErrorBoundary } from './components/layout/AppErrorBoundary.js';
import { ConfirmProvider } from './context/ConfirmContext.js';
import { GridProvider } from './context/GridContext.js';
import { RouterOrchestrator } from './components/RouterOrchestrator.js';
import { useAppInit } from './hooks/core/index.js';
import { LoadingScreen } from './components/ui/LoadingScreen.js';
import { Toaster } from 'sonner';

function AppContent({ status, error }: { status: string, error: Error | null }) {
  return (
    <AppErrorBoundary>
      <ConfirmProvider>
        <GridProvider>
          {status === 'loading' ? (
            <LoadingScreen />
          ) : status === 'error' ? (
            <LoadingScreen error={error} />
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

export default function App() {
  const { status, error } = useAppInit();

  return (
    <AppContent status={status} error={error} />
  );
}

