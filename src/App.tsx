import { useEffect, Suspense } from 'react';
import { AppErrorBoundary } from '@/components/layout/AppErrorBoundary';
import { ConfirmProvider } from './context/ConfirmContext';
import { RouterOrchestrator } from '@/components/RouterOrchestrator';
import { Analytics } from '@vercel/analytics/react';
import { useAppInit } from '@/hooks/core/useAppInit';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { PortalRoot } from '@/components/ui/PortalRoot';
import { initAuthListener } from '@/store/authStore';
import { useUI } from '@/lib/store';

export default function App() {
  const appLang = useUI((s) => s.appLang);
  const { status, error } = useAppInit();

  useEffect(() => {
    document.documentElement.dataset.lang = appLang;
  }, [appLang]);

  useEffect(() => {
    return initAuthListener();
  }, []);

  // ✅ 載入中或錯誤 → 顯示獨立載入畫面
  if (status === 'loading') {
    return <LoadingScreen />;
  }

  if (status === 'error') {
    return <LoadingScreen error={error} />;
  }

  // ✅ 載入完成 → 渲染應用
  return (
    <AppErrorBoundary>
      <ConfirmProvider>
        <Suspense fallback={<LoadingScreen />}>
          <RouterOrchestrator />
        </Suspense>
      </ConfirmProvider>
      <PortalRoot />
      <Analytics />
    </AppErrorBoundary>
  );
}

