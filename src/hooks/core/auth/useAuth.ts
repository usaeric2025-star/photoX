import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { User } from '@/types'

/**
 * Hook for authentication state and operations.
 */
export const useAuth = () => {
  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
        const { data, error } = await supabase.auth.getUser();
        if (error) return null;
        return data.user;
    },
    staleTime: Infinity,
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

  return { user, isLoading, refetch, loginWithGoogle: loginWithGoogle.mutateAsync, logout: logout.mutateAsync }
}
