import { User } from '@supabase/supabase-js';
import { supabase } from './client';

export const loginWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/#/admin',
      skipBrowserRedirect: true
    }
  });

  if (error) throw error;
  
  if (data?.url) {
    // Open in new tab/window to avoid iframe X-Frame-Options: SAMEORIGIN issues
    window.open(data.url, '_blank');
  }
  
  return null;
};

export const logout = () => supabase.auth.signOut();

export type AuthUser = User & {
  displayName?: string;
  avatarUrl?: string;
};

export const onAuthChange = (callback: (user: AuthUser | null) => void) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user || null;
    
    let authUser: AuthUser | null = null;
    if (user) {
      authUser = {
        ...user,
        displayName: user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.displayName || user.email,
        avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture
      };
    }
    callback(authUser);
  });
  return () => subscription.unsubscribe();
};
