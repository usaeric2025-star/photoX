import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { User } from '@/types'

/**
 * Hook for authentication state and operations.
 */
export const useAuth = () => {
  const { data: user, isPending, isLoading, refetch } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.auth.getUser()
        if (error) {
          if (error.message?.includes('session missing') || error.name === 'AuthSessionMissingError' || error.message?.includes('Auth session missing')) {
          } else {
            console.error('🔐 getUser 错误:', error);
          }
          return null;
        }
        const u = data?.user;
        if (!u) return null;
        return {
          id: u.id,
          email: u.email || null,
          display_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email || null,
          photo_url: u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
          avatar_url: u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
          email_verified: !!u.email_confirmed_at
        } as User;
      } catch (err) {
        console.error('🔐 useAuth queryFn 发生异常:', err);
        return null;
      }
    },
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  })

  const loginWithGoogle = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { 
          redirectTo: window.location.origin + '/admin'
        }
      });
      if (error) throw error;
    },
  })

  const logout = useMutation({
    mutationFn: async () => {
      await supabase.auth.signOut()
    },
  })

  return { user, isPending, isLoading, refetch, loginWithGoogle: loginWithGoogle.mutateAsync, logout: logout.mutateAsync }
}
