import { atom, getDefaultStore, PrimitiveAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { User } from '#src/types/index.js';
import { logger } from '#lib/logger.js';
import { supabase } from '#lib/supabase.js';
import { storage } from '#lib/storage.js';
import { safeAsync } from '#lib/utils/safeAsync.js';
import { withTimeout } from '#lib/utils.js';

// --- Atoms ---
export const userAtom = atom(null as User | null);
export const tokenAtom = atom(null as string | null);
export const authLoadingAtom = atom(true);
export const passcodeAtom = atomWithStorage<string>('ais_mock_auth_passcode', '');

const store = getDefaultStore();

// --- Actions ---
const setUser = (user: User | null) => store.set(userAtom, user);
const setToken = (token: string | null) => store.set(tokenAtom, token);
export const setAuthLoading = (loading: boolean) => store.set(authLoadingAtom, loading);

export const initAuth = async () => {
  await safeAsync(async () => {
    const sessionPromise = supabase.auth.getSession().catch(e => ({ data: { session: null }, error: e }));
    
    const { data } = await withTimeout(sessionPromise, 3000, 'Supabase Get Auth Session').catch(() => ({ data: { session: null } })) as any;
    
    if (data.session?.user) {
      const u = data.session.user;
      setToken(data.session.access_token || null);
      const mapped: User = {
        id: u.id,
        email: u.email || null,
        displayName: (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || u.email || null,
        photoUrl: (u.user_metadata?.avatar_url as string) || null,
        avatarUrl: (u.user_metadata?.avatar_url as string) || null,
        emailVerified: !!u.email_confirmed_at,
      };
      setUser(mapped);
    } else {
      setUser(null);
    }

    if (typeof window !== 'undefined') {
      try {
        const savedUrl = storage.getItem('oauth_redirect_back_url');
        if (savedUrl) {
          storage.remove('oauth_redirect_back_url');
          const urlObj = new URL(savedUrl);
          if (urlObj.origin === window.location.origin) {
            logger.info('[Auth] Restoring saved redirect-back URL after OAuth:', savedUrl);
            window.history.replaceState(null, '', urlObj.pathname + urlObj.search + urlObj.hash);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        } else {
          const hash = window.location.hash;
          const search = window.location.search;
          if (hash.includes('access_token=') || search.includes('code=')) {
            window.history.replaceState(null, '', window.location.pathname);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        }
      } catch (err) {
        logger.warn('[Auth] Failed to restore saved redirect-back URL or clean up hash:', err);
      }
    }

    setAuthLoading(false);
  }, { 
      context: 'auth-init', 
      onFinally: () => { setAuthLoading(false); } 
  });
};

export const signIn = async () => {
  await safeAsync(async () => {
    if (typeof window === 'undefined') return;

    try {
      storage.setItem('oauth_redirect_back_url', window.location.href);
    } catch (e) {
      logger.warn('[Auth] Failed to write redirect-back URL to storage:', e);
    }

    const isIframe = window.self !== window.top;
    
    if (isIframe) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { 
          redirectTo: window.location.origin,
          skipBrowserRedirect: true
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        const popup = window.open(
          data.url,
          'supabase_oauth_popup',
          'width=600,height=700,status=no,resizable=yes,scrollbars=yes'
        );
        if (!popup) {
          throw new Error('Popup blocked! Please allow popups for this site to sign in with Google.');
        }
      } else {
        throw new Error('Failed to retrieve authorization URL from Supabase.');
      }
    } else {
      const cleanRedirectUrl = window.location.origin + '/';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { 
          redirectTo: cleanRedirectUrl
        },
      });
      if (error) {
        throw error;
      }
    }
  }, { context: 'auth-signin' });
};

export const signOut = async () => {
  await safeAsync(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ais_mock_auth_passcode');
      window.location.reload();
    }
  }, { context: 'auth-signout' });
};

let authListenerInitialized = false;

export const initAuthListener = () => {
  if (authListenerInitialized) return () => {};
  authListenerInitialized = true;

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      const u = session.user;
      setToken(session.access_token || null);
      const mapped: User = {
        id: u.id,
        email: u.email || null,
        displayName: (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || u.email || null,
        photoUrl: (u.user_metadata?.avatar_url as string) || null,
        avatarUrl: (u.user_metadata?.avatar_url as string) || null,
        emailVerified: !!u.email_confirmed_at,
      };
      setUser(mapped);
      setAuthLoading(false);
    } else {
      setUser(null);
      setToken(null);
      setAuthLoading(false);
    }
  });

  const handleMessage = async (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type === 'SUPABASE_AUTH_CALLBACK') {
      const { search, hash } = event.data;
      logger.info('[Auth] Received OAuth callback from popup. Syncing session...');
      
      const newUrl = window.location.pathname + (search || '') + (hash || '');
      window.history.replaceState(null, '', newUrl);
      
      await initAuth();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('message', handleMessage);
  }
  
  return () => {
    data?.subscription.unsubscribe();
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', handleMessage);
    }
  };
};
