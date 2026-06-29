import React from 'react';
import { Router } from '@/router';
import { AppLink } from '@/components/router/AppLink';
import { Icon } from '@/components/ui/Icon';

export const NotFoundPage = () => {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  
  // Categorize the 404 cause based on the current pathname
  const getCauseDetails = () => {
    if (!pathname) {
      return {
        title: '網頁不存在 (404)',
        description: '您訪問的頁面不存在，請確認網址是否正確。',
        icon: 'file-question',
        colorClass: 'text-slate-400 bg-slate-100',
      };
    }
    
    if (pathname.startsWith('/api')) {
      return {
        title: 'API 端點未註冊 (404)',
        description: `您正試圖訪問後端介面 [${pathname}]。該 API 路由不存在、未正確掛載，或不支援當前請求方法。請檢查 api/_app.ts 路由定義或 vercel.json 的重寫映射。`,
        icon: 'server-crash',
        colorClass: 'text-red-500 bg-red-50 border border-red-100',
      };
    }
    
    if (pathname.startsWith('/admin')) {
      return {
        title: '後台頁面不存在 (404)',
        description: `無效的後台管理路徑 [${pathname}]。這可能是因為選單配置更新、歷史快取連結失效，或該管理功能已被重構搬移。`,
        icon: 'shield-alert',
        colorClass: 'text-amber-500 bg-amber-50 border border-amber-100',
      };
    }
    
    if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(pathname)) {
      return {
        title: '圖片/資源未找到 (404)',
        description: `您請求的靜態圖片資源 [${pathname}] 不存在。該資源可能已被從 R2 儲存或儲存庫中移除，或者拼寫錯誤。`,
        icon: 'image',
        colorClass: 'text-blue-500 bg-blue-50 border border-blue-100',
      };
    }
    
    return {
      title: '網頁路徑未找到 (404)',
      description: `找不到路徑 [${pathname}]。請確認拼字與路由結構是否正確，或直接返回主畫面重新導航。`,
      icon: 'map-pin-off',
      colorClass: 'text-slate-500 bg-slate-100',
    };
  };

  const details = getCauseDetails();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-800 p-6">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center text-center max-w-lg w-full animate-scale-in">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-transform duration-500 hover:scale-105 ${details.colorClass}`}>
          <Icon name={details.icon as any} size={36} />
        </div>
        
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
          {details.title}
        </h1>
        
        <div className="w-full bg-slate-50 rounded-2xl p-4 mb-8 text-left border border-slate-100">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">精準診斷原因</p>
          <p className="text-sm text-slate-600 leading-relaxed">
            {details.description}
          </p>
          {pathname && (
            <div className="mt-3 pt-3 border-t border-slate-200/60 font-mono text-xs text-slate-400 break-all flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              <span>URI: {pathname}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          <AppLink 
            to={Router.home()}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm tracking-wide hover:bg-black transition-all active:scale-[0.98]"
          >
            <Icon name="home" size={16} />
            返回首頁
          </AppLink>
          
          <button 
            onClick={() => window.history.back()}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-[0.98]"
          >
            <Icon name="arrow-left" size={16} />
            返回上一頁
          </button>
        </div>
      </div>
    </div>
  );
};

