import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/lib/store';
import { usePublicSettings } from '@/hooks';
import { useLocalStorage } from '@/hooks/core/useLocalStorage';
import { logger } from '@/lib/logger';
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner';

const LoginScreen = lazy(() => import('@/components/admin/LoginScreen').then(m => ({ default: m.LoginScreen })));

interface AdminAuthGateProps {
  children: React.ReactNode;
}

export function AdminAuthGate({ children }: AdminAuthGateProps) {
  const [passcode] = useLocalStorage({
    key: 'ais_mock_auth_passcode',
    defaultValue: '',
    getInitialValueInEffect: false,
  });

  const { user, isLoading: isAuthLoading, signIn } = useAuth();
  const { data: settings } = usePublicSettings();
  
  const isStaffMode = !!settings?.access_passcode && passcode === settings.access_passcode;
  const [forceShow, setForceShow] = useState(false);

  useEffect(() => {
    if (!isAuthLoading) return;
    const timer = setTimeout(() => {
      logger.warn('⚠️ Auth Loading 超时，强制尝试显示');
      setForceShow(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, [isAuthLoading]);

  // Auth is still loading
  if (isAuthLoading && !user && !isStaffMode && !forceShow) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">
            验证身份中 / Authenticating...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user && !isStaffMode) {
    return (
      <div className="h-screen w-full bg-slate-50">
        <Suspense fallback={
          <div className="flex h-screen w-full items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        }>
          <LoginScreen signIn={signIn} />
        </Suspense>
      </div>
    );
  }

  return <>{children}</>;
}
