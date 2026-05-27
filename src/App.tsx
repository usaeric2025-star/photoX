import { useEffect } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth, usePermission } from '@/hooks';
import { migrateStorage } from '@/lib/storage';
import { clearExpiredCaches } from './utils/indexedDB';
import { supabase } from './lib/supabase';
import { globalHandleError } from './utils/errorHandler';
import { FullPageLoading } from './components/FullPageLoading';

export default function AppRoutes() {
  const { isLoading, user } = useAuth();
  const { role, can } = usePermission();
  const queryClient = useQueryClient();
  
  // If loading inside a popup, detect auth credentials, wait for Supabase to persist them, send success postMessage, and close.
  useEffect(() => {
    if (window.opener && window.opener !== window) {
      const hasAuthData = window.location.hash.includes('access_token') || 
                          window.location.search.includes('code=') ||
                          window.location.hash.includes('error=');
      if (hasAuthData) {
        const timer = setTimeout(() => {
          try {
            // [AUTH-STORAGE-BLOCK] @ src/App.tsx:100 - Ensure UI/storage settles before signaling parent and closing
            requestAnimationFrame(() => {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            });
          } catch (e) {
            console.error('Failed to postMessage or close popup:', e);
          }
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Listen for login success event in the main application frame
  useEffect(() => {
    const handleOauthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('webcontainer')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        // [AUTH-STORAGE-BLOCK] @ src/App.tsx:119 - Move storage-intensive reload logic out of the message handler
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
          // removed window.location.reload() to prevent blank screen, useQuery reactivity handles auth
        }, 0);
      }
    };
    window.addEventListener('message', handleOauthMessage);
    return () => window.removeEventListener('message', handleOauthMessage);
  }, []);

  useEffect(() => {
    // 1. Detect OAuth error in URL hash OR query params
    const hash = window.location.hash;
    const search = window.location.search;
    const hasError = hash.includes('error=') || search.includes('error=');
    
    if (hasError) {
        const errorParams = new URLSearchParams(hash.includes('error=') ? hash.substring(1) : search.substring(1));
        const errorCode = errorParams.get('error_code') || errorParams.get('error');
        const errorDesc = errorParams.get('error_description') || '未知错误';
        
        // Suppress benign PKCE "already used" errors after first success
        if (errorDesc.includes('Unable to exchange external code') && user) {
            console.debug('Suppressed duplicate OAuth exchange error after login success');
        } else {
            globalHandleError(new Error(`${errorCode}: ${errorDesc}`), '登录发生错误 (OAuth Error)');
        }
        
        // Clear hash and query params to prevent error showing up on refresh
        window.history.replaceState(null, '', window.location.pathname);
    }

  // 2. Background cache cleanup
    migrateStorage();
    clearExpiredCaches(7).catch(err => globalHandleError(err, '本地缓存自动清理失败', true));
    
    // 3. Supabase Session Health Check
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) {
        if (!session && user) {
          console.warn('Session 丢失，建议重新登录');
        }
      }
    }).catch((e: any) => {
      if (active) globalHandleError(e, '验证用户会话会话失败', true);
    });

    return () => {
        active = false;
    };
  }, [user]);

  // Handle Global Search Debouncing via local state or query logic
  
  if (isLoading) return <FullPageLoading />;

  return (
      <RouterProvider router={router} context={{ user, role, can }} />
  );
}
