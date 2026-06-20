import React from 'react';
import { useRouter } from '@tanstack/react-router';
import { AlertCircle, RefreshCw, Home, Copy, Terminal } from '@/components/ui/Icon';
import { useTranslation, useCopyToClipboard } from '@/hooks';

export function RouteErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const { uiTranslations: t } = useTranslation();
  const { copy } = useCopyToClipboard({ successMessage: '诊断信息已复制到剪贴板' });

  const isValidationError = error.message.includes('validateSearch') || error.message.includes('Invalid search');

  const handleCopyDiagnostics = () => {
    const timestamp = new Date().toISOString();
    const diagnosticInfo = [
      `--- 路由异常诊断 ---`,
      `时间戳: ${timestamp}`,
      `路径: ${window.location.pathname}`,
      `错误信息: ${error.message}`,
      `堆栈: ${error.stack || 'N/A'}`
    ].join('\n');
    copy(diagnosticInfo);
  };
  
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white/80 backdrop-blur-md rounded-3xl border border-red-50 shadow-xl shadow-red-500/5 max-w-md mx-auto mt-20 space-y-6">
      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-2 animate-bounce-subtle">
        <AlertCircle size={32} />
      </div>
      
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-slate-900">
          {isValidationError ? '页面参数异常' : '路由加载失败'} 
        </h3>
        <p className="text-sm text-slate-500 px-4">
          您可以尝试刷新页面，或返回首页。如果问题持续，请联系支持人员。
        </p>
      </div>

      <div className="w-full bg-slate-50 rounded-xl p-4 border border-slate-100">
        <div className="flex items-center gap-2 mb-2">
          <Terminal size={10} className="text-slate-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">错误代码</span>
        </div>
        <code className="text-[11px] text-red-500 font-mono break-all line-clamp-2 leading-relaxed">
          {error.message || 'Unknown Routing Error'}
        </code>
      </div>

      <div className="flex flex-col w-full gap-3">
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={() => reset()}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all text-sm font-semibold active:scale-95 shadow-lg shadow-slate-900/20"
          >
            <RefreshCw size={16} />
            立即重试
          </button>
          <button
            onClick={handleCopyDiagnostics}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-sm font-semibold active:scale-95 text-nowrap"
          >
            <Copy size={16} />
            复制诊断
          </button>
        </div>
        
        <button
          onClick={() => {
            router.navigate({ to: '/', replace: true, search: {} });
          }}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all text-sm font-semibold active:scale-95"
        >
          <Home size={16} />
          回到底部首页
        </button>
      </div>
    </div>
  );
}
