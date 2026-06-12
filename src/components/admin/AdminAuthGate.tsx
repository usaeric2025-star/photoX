import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { LoginScreen } from '@/components/admin/LoginScreen';
import { useAuth, useSettings } from '@/hooks';
import { useLocalStorage } from '@/hooks/core/useLocalStorage';
import { logger } from '@/lib/logger';

interface AdminAuthGateProps {
  children: React.ReactNode;
  isSyncing?: boolean;
}

export function AdminAuthGate({ children, isSyncing }: AdminAuthGateProps) {
  const [passcode] = useLocalStorage({
    key: 'ais_mock_auth_passcode',
    defaultValue: '',
    getInitialValueInEffect: false,
  });

  const { user, isLoading: isAuthLoading, loginWithGoogle } = useAuth();
  const { settings } = useSettings();
  
  const isStaffMode = passcode === settings?.access_passcode && !!settings?.access_passcode;
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
          <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
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
      <div className="h-screen w-full">
        <LoginScreen loginWithGoogle={loginWithGoogle} isLoading={isSyncing} />
      </div>
    );
  }

  return <>{children}</>;
}
