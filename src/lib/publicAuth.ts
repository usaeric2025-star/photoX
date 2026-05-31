import { supabase } from '@/lib/supabase';

export interface PublicAuthResult {
  user: any;
  isAuthenticated: boolean;
}

export async function checkPublicAuth(): Promise<PublicAuthResult> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return { user: null, isAuthenticated: false };
    }
    
    // Map minimal user info to remain compatible
    const mappedUser = {
      ...user,
      photo_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      email: user.email,
    };
    
    return { user: mappedUser, isAuthenticated: true };
  } catch (err) {
    console.error('Error checking public auth:', err);
    return { user: null, isAuthenticated: false };
  }
}

export async function logoutPublic(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error('Error during public logout:', err);
  } finally {
    window.location.href = '/';
  }
}
