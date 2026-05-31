import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: any | null;
  isAuthReady: boolean;
  initAuth: () => Promise<void>;
  setUser: (user: any | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthReady: false,
  setUser: (user) => set({ user }),
  initAuth: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    set({ user, isAuthReady: true });
  },
}));
