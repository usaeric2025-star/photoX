import { createStore } from '@storve/core';
import { signal } from '@storve/core/signals';
import { useStore } from '@storve/react';
import { logger } from '@/lib/logger';
import { User } from '@/types';
import { supabase } from '@/lib/supabase';
import { storage } from '@/services/storage';
import { safeAsync } from '@/lib/utils/safeAsync';

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
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{ data: { session: null }, error: Error }>((_, reject) => {
        setTimeout(() => reject(new Error('验证超时 (3秒)')), 3000);
      });
      
      const { data } = await Promise.race([sessionPromise, timeoutPromise]) as { 
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
        error: unknown; 
      };
      
      if (data.session?.user) {
        const u = data.session.user;
        const mapped: User = {
          id: u.id,
          email: u.email || null,
          display_name: (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || u.email || null,
          photo_url: (u.user_metadata?.avatar_url as string) || null,
          avatar_url: (u.user_metadata?.avatar_url as string) || null,
          email_verified: !!u.email_confirmed_at,
        };
        authStore.setState({ user: mapped, isLoading: false });
      } else {
        authStore.setState({ user: null, isLoading: false });
      }
    }, { 
        context: '身份验证初始化', 
        onFinally: () => authStore.setState({ isLoading: false }) 
    });
  },
  
  signIn: async () => {
    await safeAsync(async () => {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.href },
      });
    }, { context: '登录' });
  },
  
  signOut: async () => {
    await safeAsync(async () => {
      await supabase.auth.signOut();
      authStore.setState({ user: null });
      if (typeof window !== 'undefined') {
        storage.remove('ais_mock_auth_passcode');
        window.location.reload();
      }
    }, { context: '登出' });
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
        display_name: (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || u.email || null,
        photo_url: (u.user_metadata?.avatar_url as string) || null,
        avatar_url: (u.user_metadata?.avatar_url as string) || null,
        email_verified: !!u.email_confirmed_at,
      };
      authStore.setState({ user: mapped, isLoading: false });
    } else {
      authStore.setState({ user: null, isLoading: false });
    }
  });
  
  return () => data?.subscription.unsubscribe();
};
