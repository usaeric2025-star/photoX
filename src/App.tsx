import { Suspense } from 'react';
import { AppErrorBoundary } from '@/components/layout/AppErrorBoundary';
import { ConfirmProvider } from './context/ConfirmContext';
import { RouterOrchestrator } from '@/components/RouterOrchestrator';
import { Analytics } from '@vercel/analytics/react';
import { useAppInit } from '@/hooks/core/useAppInit';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useRouteSync } from '@/hooks/core/useRouteSync';
import { DialogContainer } from '@/components/layout/DialogContainer';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const { status, error } = useAppInit();

  // ✅ 路由同步
  useRouteSync();

  return (
    <AppErrorBoundary>
      <ConfirmProvider>
        <AnimatePresence mode="wait">
          {status === 'loading' ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
            >
              <LoadingScreen />
            </motion.div>
          ) : status === 'error' ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
            >
              <LoadingScreen error={error} />
            </motion.div>
          ) : (
            <motion.div
              key="app"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="relative min-h-screen"
            >
              <Suspense fallback={<LoadingScreen />}>
                <RouterOrchestrator />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </ConfirmProvider>
      <DialogContainer />
      <Analytics />
    </AppErrorBoundary>
  );
}

