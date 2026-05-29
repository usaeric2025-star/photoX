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
  const { isLoading, user, refetch } = useAuth();
  const { role, can } = usePermission();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        // [OAUTH-CALLBACK-ATOMIC] Write to storage, invalidate and refetch synchronously.
        queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
        await refetch();
      }
    });
    
    // bfcache compatibility: ensure auth state is fresh when returning from back/forward cache
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [queryClient]);

  // If loading inside a popup, detect auth credentials, wait for Supabase to persist them, send success postMessage, and close.
  useEffect(() => {
    if (window.opener && window.opener !== window) {
      const hasAuthData = window.location.hash.includes('access_token') || 
                          window.location.search.includes('code=') ||
                          window.location.hash.includes('error=');
      if (hasAuthData) {
        
        // [OAUTH-CALLBACK-FIXED] Wait for exact token write event from Supabase instead of race condition timeout
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
           if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || window.location.hash.includes('error=')) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
           }
        });
        
        // Failsafe
        const timer = setTimeout(() => {
          try {
            requestAnimationFrame(() => {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            });
          } catch (e) {}
        }, 3000);

        return () => {
           subscription.unsubscribe();
           clearTimeout(timer);
        };
      }
    }
  }, []);

  // [AUTH-CHAIN-AUDITED] Listen for login success event in the main application frame
  useEffect(() => {
    const handleOauthMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      const isAllowedOrigin = 
        origin === window.location.origin ||
        origin.endsWith('.run.app') || 
        origin.includes('localhost') || 
        origin.includes('webcontainer') || 
        origin.includes('vercel.app') || 
        origin.includes('stackblitz');

      if (!isAllowedOrigin) return;
      
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        // 等待 Session 写入完成（轮询）
        let retries = 0;
        let hasSession = false;
        while (retries < 10 && !hasSession) {
          await new Promise(r => setTimeout(r, 200));
          const { data: { session } } = await supabase.auth.getSession();
          hasSession = !!session;
          retries++;
        }
        
        // 刷新用户状态
        await queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
        await refetch();
        
        // 让路由自己处理跳转，不强制 window.location
        router.invalidate();
      }
    };
    window.addEventListener('message', handleOauthMessage);
    return () => window.removeEventListener('message', handleOauthMessage);
  }, [queryClient, refetch]);

  // Invalidate router context when auth credentials change or load completes
  useEffect(() => {
    if (!isLoading) {
      router.invalidate();
    }
  }, [user, role, isLoading]);

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
  
  console.log('🔍 AppRoutes 渲染:', { 
    isLoading, 
    user: user?.email, 
    pathname: window.location.pathname 
  });

  if (isLoading && window.location.pathname.startsWith('/admin')) {
    console.log('🔍 显示 FullPageLoading');
    return <FullPageLoading />;
  }

  return (
      <RouterProvider router={router} context={{ user, role, can }} />
  );
}
