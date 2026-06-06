import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';
import { useLocalStorage } from '@mantine/hooks';

// 带超时的 getUser（15秒）
async function getUserWithTimeout(): Promise<User | null> {
  const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  if (!session?.user) {
    return null;
  }

  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => {
      console.warn('[useAuth] getUser timeout after 15s, returning fallback session user');
      resolve(null);
    }, 15000);
  });

  const getUserPromise = supabase.auth.getUser().catch(() => ({ data: { user: null }, error: null }));

  const result = await Promise.race([getUserPromise, timeoutPromise]);

  if (result === null) {
    const u = session.user;
    return {
      id: u.id,
      email: u.email || null,
      display_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email || null,
      photo_url: u.user_metadata?.avatar_url || null,
      avatar_url: u.user_metadata?.avatar_url || null,
      email_verified: !!u.email_confirmed_at,
    } as User;
  }

  const { data, error } = result as any;
  if (error || !data?.user) return null;

  const u = data.user;
  return {
    id: u.id,
    email: u.email || null,
    display_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email || null,
    photo_url: u.user_metadata?.avatar_url || null,
    avatar_url: u.user_metadata?.avatar_url || null,
    email_verified: !!u.email_confirmed_at,
  } as User;
}

export function useAuth() {
  const queryClient = useQueryClient();
  
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // [useAuth] event handler debug removed

      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

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
