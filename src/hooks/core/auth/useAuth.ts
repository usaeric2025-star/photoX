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
      const { data } = await supabase.auth.getUser()
      const u = data.user;
      if (!u) return null;
      return {
        id: u.id,
        email: u.email || null,
        display_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email || null,
        photo_url: u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
        avatar_url: u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
        email_verified: !!u.email_confirmed_at
      } as User;
    },
    staleTime: Infinity,
  })

  const loginWithGoogle = useMutation({
    mutationFn: async () => {
      // 1. Get the OAuth URL without redirecting current window
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { 
          redirectTo: window.location.origin + '/admin',
          skipBrowserRedirect: true
        }
      });
      
      if (error) throw error;
      if (!data?.url) throw new Error('No authorization URL returned from Supabase');

      // 2. Open login in popup window
      const authWindow = window.open(
        data.url,
        'supabase_oauth_popup',
        'width=600,height=700'
      );

      if (!authWindow) {
        throw new Error('Please allow popups for this site to complete login.');
      }
    },
  })

  const logout = useMutation({
    mutationFn: async () => {
      await supabase.auth.signOut()
    },
  })

  return { user, isPending, isLoading, refetch, loginWithGoogle: loginWithGoogle.mutateAsync, logout: logout.mutateAsync }
}
