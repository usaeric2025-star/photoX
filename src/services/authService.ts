import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User } from '../types';

let wasAuthenticated = false;

// Initialize wasAuthenticated based on current session
supabase.auth.getSession().then(({ data: { session } }) => {
  wasAuthenticated = !!session;
}).catch((error) => {
  console.error("Auth initialization check failed:", error);
});

export const loginWithGoogle = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      wasAuthenticated = true;
      return { user: session.user };
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/admin',
        skipBrowserRedirect: true
      }
    });

    if (error) throw error;
    if (!data?.url) throw new Error('No authorization URL returned from Supabase');

    const authWindow = window.open(
      data.url,
      'supabase_oauth_popup',
      'width=600,height=700'
    );

    if (!authWindow) {
      throw new Error('Please allow popups for this site to complete login.');
    }

    return data;
  } catch (err: unknown) {
    throw err;
  }
};

export const logout = async () => {
  wasAuthenticated = false;
  try {
    const res = await supabase.auth.signOut();
    return res;
  } catch (err) {
    throw err;
  }
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      if (wasAuthenticated) {
        console.warn('Authentication token expired or user signed out.');
      }
      wasAuthenticated = false;
    } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      wasAuthenticated = true;
    }

    const user = session?.user || null;
    
    let authUser: User | null = null;
    if (user) {
      authUser = {
        id: user.id,
        email: user.email || null,
        display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.displayName || user.email || null,
        photo_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        email_verified: !!user.email_confirmed_at
      };
    }
    callback(authUser);
  });
  return () => subscription.unsubscribe();
};
