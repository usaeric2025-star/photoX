import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';
import { useLocalStorage } from '@mantine/hooks';
import { router } from '@/router';

// 带超时的 getUser（5秒）
async function getUserWithTimeout(): Promise<User | null> {
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => {
      console.warn('[useAuth] getUser timeout after 5s, returning null');
      resolve(null);
    }, 5000);
  });

  const getUserPromise = supabase.auth.getUser().catch(() => ({ data: { user: null }, error: null }));

  const result = await Promise.race([getUserPromise, timeoutPromise]);

  if (result === null) return null;

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
    if (user) {
      router.update({
        context: {
          user: user,
          role: 'admin',
          can: () => true,
          availableActions: [],
        },
      });
    } else {
      router.update({
        context: {
          user: null,
          role: 'guest',
          can: () => false,
          availableActions: [],
        },
      });
    }
  }, [user]);

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
