import { useEffect, useMemo } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth, usePermission } from '@/hooks';
import { migrateStorage } from '@/lib/storage';
import { clearExpiredCaches } from './lib/db/indexedDB';
import { supabase } from './lib/supabase';
import { globalHandleError } from './lib/error/errorHandler';
import { FullPageLoading } from './components/FullPageLoading';

export default function AppRoutes() {
  const { isLoading, user } = useAuth();
  const { role, can } = usePermission();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        console.log(`🔐 App.tsx onAuthStateChange event: ${event}`);
        // [OAUTH-CALLBACK-ATOMIC] Write to storage, invalidate synchronously.
        await queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
        router.invalidate();

        if (event === 'SIGNED_IN') {
          // If we are currently on the home page or root path, redirect automatically to admin mode
          if (window.location.pathname === '/' || window.location.pathname === '') {
            console.log('🚀 User signed in on root page. Navigating to /admin');
            router.navigate({ to: '/admin' as any });
          }
        }
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

  // Synchronize router context whenever auth user or permission changes
  useEffect(() => {
    if (user !== undefined) {
      console.log('🔄 Invalidating router after auth context update', { user: user?.email, role });
      router.invalidate();
    }
  }, [user, role]);

  const routerContext = useMemo(() => ({ user, role, can }), [user, role, can]);

  return (
      <RouterProvider router={router} context={routerContext} />
  );
}
