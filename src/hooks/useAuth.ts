import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export const useAuth = () => {
  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser()
      return data.user
    },
    staleTime: Infinity,
  })

  const loginWithGoogle = useMutation({
    mutationFn: async () => {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/admin' }
      })
    },
  })

  const logout = useMutation({
    mutationFn: async () => {
      await supabase.auth.signOut()
    },
  })

  return { user, isLoading, loginWithGoogle: loginWithGoogle.mutateAsync, logout: logout.mutateAsync }
}
