import { userAtom, authLoadingAtom, passcodeAtom, signIn } from '#src/store/index.js';
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { usePublicSettings, useTranslation } from '#src/hooks/index.js';
import { LoadingSpinner } from '#src/components/ui/feedback/LoadingSpinner.js';
import { RequirePermission } from '#src/components/auth/RequirePermission.js';
import { AdminModeProvider } from '#src/hooks/index.js';
import { useAtomValue } from 'jotai';

const LoginScreen = lazy(() => import('./LoginScreen.js').then(m => ({ default: m.LoginScreen })));
interface AdminAuthGateProps {
  children: React.ReactNode;
}
export function AdminAuthGate({ children }: AdminAuthGateProps) {
  const { t } = useTranslation();
  let passcode = useAtomValue(passcodeAtom);
  try {
    if (typeof passcode === 'string' && passcode.startsWith('"')) {
      passcode = JSON.parse(passcode);
    }
  } catch (e) {}
  
  const user = useAtomValue(userAtom);
  const isAuthLoading = useAtomValue(authLoadingAtom);
  
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

  // ✅ Loading state protection: don't let it fall through to a 404 or login screen too early
  if ((isAuthLoading || isSettingsLoading) && !user && !isStaffMode && !forceShow) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">
            {t('authenticating')}
          </p>
        </div>
      </div>
    );
  }

  // ✅ Auth Gate Logic
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

  return (
    <RequirePermission
      permission="staff:workspace:access"
      fallback={
        <div className="h-screen w-full bg-slate-50">
          <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          }>
            <LoginScreen signIn={signIn} />
          </Suspense>
        </div>
      }
    >
      <AdminModeProvider value={true}>
        {children}
      </AdminModeProvider>
    </RequirePermission>
  );
}
