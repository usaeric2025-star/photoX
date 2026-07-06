import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '#lib/store/index.js';
import { usePublicSettings } from '#src/hooks/index.js';
import { useLocalStorage } from '#src/hooks/core/useLocalStorage.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { LoadingSpinner } from '#src/components/ui/feedback/LoadingSpinner.js';

const LoginScreen = lazy(() => import('./LoginScreen.js').then(m => ({ default: m.LoginScreen })));

interface AdminAuthGateProps {
  children: React.ReactNode;
}

export function AdminAuthGate({ children }: AdminAuthGateProps) {
  const [passcode] = useLocalStorage({
    key: 'ais_mock_auth_passcode',
    defaultValue: '',
    getInitialValueInEffect: false,
    deserialize: (val) => {
      try {
        const parsed = JSON.parse(val);
        return String(parsed);
      } catch {
        return val;
      }
    }
  });

  const user = useAuth(s => s.user);
  const isAuthLoading = useAuth(s => s.isLoading);
  const signIn = useAuth(s => s.signIn);
  const { data: settings, isLoading: isSettingsLoading } = usePublicSettings();
  
  const isStaffMode = !!settings?.accessPasscode && String(passcode) === settings.accessPasscode;
  const [forceShow, setForceShow] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !isSettingsLoading) return;
    const timer = setTimeout(() => {
      setForceShow(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [isAuthLoading, isSettingsLoading]);

  // Auth or settings are still loading
  if ((isAuthLoading || isSettingsLoading) && !user && !isStaffMode && !forceShow) {
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
