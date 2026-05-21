import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { User } from '@/types'

export const useAuth = () => {
  const { data: user, isLoading } = useQuery({
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
