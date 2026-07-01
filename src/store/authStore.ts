import { createStore } from '@storve/core';
import { signal } from '@storve/core/signals';
import { useStore } from '@storve/react';
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

export const authStore = createStore<AuthState>({
  user: null,
  isLoading: true,
  setUser: (user) => {
    authStore.setState({ user, isLoading: false });
  },
  setLoading: (loading) => authStore.setState({ isLoading: loading }),
  
  init: async () => {
    await safeAsync(async () => {
      const sessionPromise = supabase.auth.getSession().catch(e => ({ data: { session: null }, error: e }));
      
      const { data } = await withTimeout(sessionPromise, 3000, 'Supabase Get Auth Session').catch(() => ({ data: { session: null } })) as { 
        data: { 
          session: { 
            user: { 
              id: string; 
              email?: string; 
              user_metadata: Record<string, unknown>;
              email_confirmed_at?: string;
            } 
          } | null 
        }; 
        error?: unknown; 
      };
      
      if (data.session?.user) {
        const u = data.session.user;
        const mapped: User = {
          id: u.id,
          email: u.email || null,
          displayName: (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || u.email || null,
          photoUrl: (u.user_metadata?.avatar_url as string) || null,
          avatarUrl: (u.user_metadata?.avatar_url as string) || null,
          emailVerified: !!u.email_confirmed_at,
        };
        authStore.setState({ user: mapped, isLoading: false });
      } else {
        authStore.setState({ user: null, isLoading: false });
      }
    }, { 
        context: 'auth-init', 
        onFinally: () => authStore.setState({ isLoading: false }) 
    });
  },
  
  signIn: async () => {
    await safeAsync(async () => {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.href },
      });
    }, { context: 'auth-signin' });
  },
  
  signOut: async () => {
    await safeAsync(async () => {
      await supabase.auth.signOut();
      authStore.setState({ user: null });
      if (typeof window !== 'undefined') {
        storage.remove('ais_mock_auth_passcode');
        window.location.reload();
      }
    }, { context: 'auth-signout' });
  },
});

export function useAuthStore<T = AuthState>(selector?: (state: AuthState) => T): T {
  return useStore(authStore, selector);
}

export const userSignal = signal(authStore, 'user');
export const authLoadingSignal = signal(authStore, 'isLoading');

// 全局监听（只初始化一次）
let authListenerInitialized = false;

export const initAuthListener = () => {
  if (authListenerInitialized) return () => {};
  authListenerInitialized = true;
  
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      const u = session.user;
      const mapped: User = {
        id: u.id,
        email: u.email || null,
        displayName: (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || u.email || null,
        photoUrl: (u.user_metadata?.avatar_url as string) || null,
        avatarUrl: (u.user_metadata?.avatar_url as string) || null,
        emailVerified: !!u.email_confirmed_at,
      };
      authStore.setState({ user: mapped, isLoading: false });
    } else {
      authStore.setState({ user: null, isLoading: false });
    }
  });
  
  return () => data?.subscription.unsubscribe();
};
