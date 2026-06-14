import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';
import { useLocalStorage } from '@/hooks/core/useLocalStorage';

// Optimized getUser: resolve immediately if session is locally available
async function getUserWithTimeout(): Promise<User | null> {
  const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  
  if (!session?.user) {
    return null;
  }

  const u = session.user;
  const mappedUser: User = {
    id: u.id,
    email: u.email || null,
    display_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email || null,
    photo_url: u.user_metadata?.avatar_url || null,
    avatar_url: u.user_metadata?.avatar_url || null,
    email_verified: !!u.email_confirmed_at,
  };

  // Skip the heavyweight getUser() network call on initial boot if session exists.
  // We already have a valid local user object from the JWT in session.
  // The onAuthStateChange listener will handle any subsequent updates.
  return mappedUser;
}

let globalListenerInitialized = false;
let activeQueryClient: any = null;

export function useAuth() {
  const queryClient = useQueryClient();
  activeQueryClient = queryClient;
  
  const [, , removePasscode] = useLocalStorage({
    key: 'ais_mock_auth_passcode',
    defaultValue: '',
  });

  const { data: user, isLoading, isPending } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: getUserWithTimeout,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  useEffect(() => {
    if (!globalListenerInitialized) {
      globalListenerInitialized = true;
      supabase.auth.onAuthStateChange((event, session) => {
        if (!activeQueryClient) return;
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
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
            
            // Only set the query data if the cached user has actually changed/is missing
            const currentUser = activeQueryClient.getQueryData(['auth', 'user']);
            if (!currentUser || currentUser.id !== mapped.id || currentUser.email !== mapped.email) {
              activeQueryClient.setQueryData(['auth', 'user'], mapped);
            }
          } else {
            activeQueryClient.setQueryData(['auth', 'user'], null);
          }
        } else if (event === 'SIGNED_OUT') {
          activeQueryClient.setQueryData(['auth', 'user'], null);
        }
      });
    }
  }, []);

  return {
    user: user ?? null,
    isLoading,
    isPending,
    isAuthenticated: !!user,
    refetch: () => {},
    loginWithGoogle: async () => {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.href }
      });
    },
    logout: async () => {
      if (typeof window !== 'undefined') {
        removePasscode();
      }
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    },
  };
}
