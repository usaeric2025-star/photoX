import { create } from 'zustand';
import { User } from '@/types';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  init: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  
  init: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        const u = data.session.user;
        const mapped: User = {
          id: u.id,
          email: u.email || null,
          display_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email || null,
          photo_url: u.user_metadata?.avatar_url || null,
          avatar_url: u.user_metadata?.avatar_url || null,
          email_verified: !!u.email_confirmed_at,
        };
        set({ user: mapped, isLoading: false });
      } else {
        set({ user: null, isLoading: false });
      }
    } catch (e) {
      set({ user: null, isLoading: false });
    }
  },
  
  signIn: async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    });
  },
  
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('ais_mock_auth_passcode');
      window.location.reload();
    }
  },
}));

// 全域監聽（只初始化一次）
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
        display_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email || null,
        photo_url: u.user_metadata?.avatar_url || null,
        avatar_url: u.user_metadata?.avatar_url || null,
        email_verified: !!u.email_confirmed_at,
      };
      useAuthStore.getState().setUser(mapped);
    } else {
      useAuthStore.getState().setUser(null);
    }
  });
  
  return () => data?.subscription.unsubscribe();
};
