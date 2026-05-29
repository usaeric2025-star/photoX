import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function AuthCallback() {
  useEffect(() => {
    const handleCallback = async () => {
      const code = new URLSearchParams(window.location.search).get('code');
      if (!code) {
        window.location.href = '/';
        return;
      }
      
      try {
        await supabase.auth.exchangeCodeForSession(window.location.href);
      } catch (err) {
        console.error('Error exchanging authorization code:', err);
      }
      
      window.location.href = '/admin';
    };
    
    handleCallback();
  }, []);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-800">
      <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-xl shadow-sm border border-slate-100">
        <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-sm font-medium">正在登录，请稍候...</p>
      </div>
    </div>
  );
}
