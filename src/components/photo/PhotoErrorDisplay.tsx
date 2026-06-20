import React, { useState } from 'react';
import { useTranslation } from '@/hooks/core/useTranslation';
import { classifyPhotoError, getLocalizedError, showErrorToast, showSuccessToast } from '@/lib/error';
import { WifiOff, ShieldAlert, FolderOpen, ServerCrash, AlertCircle, RefreshCw, Copy, Check } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface PhotoErrorDisplayProps {
  error: unknown;
  onRetry?: () => void;
}

export function PhotoErrorDisplay({ error, onRetry }: PhotoErrorDisplayProps) {
  const { lang } = useTranslation();
  const errorType = classifyPhotoError(error);
  const localized = getLocalizedError(errorType, lang);
  const [copied, setCopied] = useState(false);

  // Extract diagnostics safely
  const errObj = error as Record<string, unknown>;
  const traceId = typeof errObj.traceId === 'string' ? errObj.traceId : null;
  const code = typeof errObj.code === 'string' ? errObj.code : null;
  const message = error instanceof Error ? error.message : String(error);
  const timestamp = new Date().toLocaleString('zh-CN');

  const diagnosticsText = `
[PhotoX Error Report]
Time: ${timestamp}
Type: ${errorType}
Code: ${code || 'Unknown'}
Trace: ${traceId || 'None'}
Message: ${message}
  `.trim();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(diagnosticsText);
      setCopied(true);
      showSuccessToast('已复制诊断信息到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showErrorToast('复制失败，请手动选择文字');
    }
  };

  const IconComponent = (() => {
    switch (errorType) {
      case 'network': return WifiOff;
      case 'unauthorized': return ShieldAlert;
      case 'not_found': return FolderOpen;
      case 'server': return ServerCrash;
      default: return AlertCircle;
    }
  })();

  const handleActionClick = () => {
    if (errorType === 'unauthorized') {
      window.location.href = '/admin';
    } else if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center p-10 space-y-7 max-w-lg mx-auto bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 animate-scale-in">
      <div className={cn(
        "inline-flex items-center justify-center w-20 h-20 rounded-full mb-2 transition-transform duration-500 hover:rotate-12",
        errorType === 'network' ? 'bg-amber-50 text-amber-500' : 'bg-red-50 text-red-500'
      )}>
        <IconComponent className="w-10 h-10" />
      </div>

      <div className="space-y-3">
        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
          {localized.title}
        </h3>
        <p className="text-base text-slate-500 leading-relaxed max-w-sm mx-auto">
          {localized.message}
        </p>
      </div>

      {/* Technical trace log for diagnosis - Expanded and with copy button */}
      <div className="w-full space-y-3">
        <div className="group relative w-full bg-slate-900 rounded-xl p-5 text-left font-mono text-[11px] text-slate-300 border border-slate-800 shadow-inner overflow-hidden">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-bold text-slate-500 tracking-widest text-[9px] uppercase">Diagnostics Log</span>
            </div>
            <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-widest">{errorType}</span>
          </div>
          
          <div className="space-y-1.5 opacity-80">
            {traceId && (
              <div className="flex gap-2">
                <span className="text-slate-600 shrink-0">TRACE:</span>
                <span className="truncate text-brand-gold/80">{traceId}</span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="text-slate-600 shrink-0">ERROR:</span>
              <span className="break-all whitespace-pre-wrap max-h-24 overflow-y-auto no-scrollbar scroll-smooth">
                {message}
              </span>
            </div>
          </div>

          {/* Copy info overlay button */}
          <button
            onClick={handleCopy}
            className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 shadow-lg border border-slate-700 active:scale-95"
            title="复制诊断信息"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
        
        <p className="text-[10px] text-slate-400 italic">
          若问题持续发生，请点击上方黑色区域右上角的按钮复制信息并联系支持团队。
        </p>
      </div>

      <div className="flex items-center gap-3 w-full">
        <button
          type="button"
          onClick={handleActionClick}
          className="flex-1 inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-black transition-all duration-300 shadow-lg shadow-slate-200 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 cursor-pointer min-h-[44px]"
        >
          <RefreshCw className="w-4 h-4" />
          {localized.action}
        </button>
      </div>
    </div>
  );
}
