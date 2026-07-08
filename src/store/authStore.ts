import { signal, computed } from '@preact/signals-react';
import { useComputed } from '@preact/signals-react';
import { logger } from '#lib/logger.js';
import { User } from '#src/types/index.js';
import { supabase } from '#lib/supabase.js';
import { storage } from '#src/services/storage/index.js';
import { safeAsync } from '#lib/utils/safeAsync.js';
import { withTimeout } from '#lib/utils.js';

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  init: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const userSignal = signal<User | null>(null);
export const tokenSignal = signal<string | null>(null);
export const authLoadingSignal = signal<boolean>(true);

export const setUser = (user: User | null) => {
  userSignal.value = user;
  authLoadingSignal.value = false;
};

export const setLoading = (loading: boolean) => {
  authLoadingSignal.value = loading;
};

export const initAuth = async () => {
  await safeAsync(async () => {
    const sessionPromise = supabase.auth.getSession().catch(e => ({ data: { session: null }, error: e }));
    
    const { data } = await withTimeout(sessionPromise, 3000, 'Supabase Get Auth Session').catch(() => ({ data: { session: null } })) as any;
    
    if (data.session?.user) {
      const u = data.session.user;
      tokenSignal.value = data.session.access_token || null;
      const mapped: User = {
        id: u.id,
        email: u.email || null,
        displayName: (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || u.email || null,
        photoUrl: (u.user_metadata?.avatar_url as string) || null,
        avatarUrl: (u.user_metadata?.avatar_url as string) || null,
        emailVerified: !!u.email_confirmed_at,
      };
      userSignal.value = mapped;
      authLoadingSignal.value = false;
    } else {
      userSignal.value = null;
      authLoadingSignal.value = false;
    }
  }, { 
      context: 'auth-init', 
      onFinally: () => { authLoadingSignal.value = false; } 
  });
};

export const signIn = async () => {
  await safeAsync(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    });
  }, { context: 'auth-signin' });
};

export const signOut = async () => {
  await safeAsync(async () => {
    await supabase.auth.signOut();
    userSignal.value = null;
    tokenSignal.value = null;
    if (typeof window !== 'undefined') {
      storage.remove('ais_mock_auth_passcode');
      window.location.reload();
    }
  }, { context: 'auth-signout' });
};

// 全局监听（只初始化一次）
let authListenerInitialized = false;

export const initAuthListener = () => {
  if (authListenerInitialized) return () => {};
  authListenerInitialized = true;
  
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      const u = session.user;
      tokenSignal.value = session.access_token || null;
      const mapped: User = {
        id: u.id,
        email: u.email || null,
        displayName: (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || u.email || null,
        photoUrl: (u.user_metadata?.avatar_url as string) || null,
        avatarUrl: (u.user_metadata?.avatar_url as string) || null,
        emailVerified: !!u.email_confirmed_at,
      };
      userSignal.value = mapped;
      authLoadingSignal.value = false;
    } else {
      userSignal.value = null;
      tokenSignal.value = null;
      authLoadingSignal.value = false;
    }
  });
  
  return () => data?.subscription.unsubscribe();
};
