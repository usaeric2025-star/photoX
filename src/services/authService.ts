import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User } from '../types';

export const loginWithGoogle = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      console.log("Already logged in as:", session.user.email);
      return { user: session.user };
    }

    const redirectUrl = window.location.origin;
    console.log("Initiating Google login with redirect to:", redirectUrl);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          prompt: 'select_account',
        }
      }
    });

    if (error) throw error;
    return data;
  } catch (err: any) {
    console.error("Login Exception:", err);
    throw err;
  }
};

export const logout = () => supabase.auth.signOut();

export const onAuthChange = (callback: (user: User | null) => void) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user || null;
    
    let authUser: User | null = null;
    if (user) {
      authUser = {
        id: user.id,
        email: user.email || null,
        displayName: user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.displayName || user.email || null,
        photoURL: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        emailVerified: !!user.email_confirmed_at
      };
    }
    callback(authUser);
  });
  return () => subscription.unsubscribe();
};
