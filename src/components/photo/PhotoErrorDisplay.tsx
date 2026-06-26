import React, { useState } from 'react';
import { useTranslation } from '@/hooks/core/useTranslation';
import { classifyPhotoError, getLocalizedError } from '@/lib/error/photoErrors';
import { showErrorToast, showSuccessToast } from '@/lib/error/errorUI';
import { Icon, IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { copyToClipboard } from '@/utils/clipboard';

interface PhotoErrorDisplayProps {
  error: unknown;
  onRetry?: () => void;
}

export function PhotoErrorDisplay({ error, onRetry }: PhotoErrorDisplayProps) {
  const { lang } = useTranslation();
  const errorType = classifyPhotoError(error);
  const localized = getLocalizedError(errorType, lang);
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Extract diagnostics safely
  const errObj = error as Record<string, unknown>;
  const traceId = typeof errObj.traceId === 'string' ? errObj.traceId : null;
  const code = typeof errObj.code === 'string' ? errObj.code : null;
  
  let message = '';
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else {
    try {
      message = JSON.stringify(error);
    } catch (e) {
      message = String(error);
    }
  }

  if (message) {
    message = message.replace(/data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/g, '[BASE64_IMAGE_TRUNCATED]');
    if (message.length > 500) {
      message = message.substring(0, 500) + `... (內容過長已截斷)`;
    }
  }

  const timestamp = new Date().toLocaleString('zh-CN');

  const diagnosticsText = [
    `--- PHOTX 載入錯誤診斷報告 ---`,
    `時間: ${timestamp}`,
    `錯誤類型: ${errorType}`,
    `錯誤代碼: ${code || '無'}`,
    `追蹤 ID: ${traceId || '無'}`,
    `詳細網址: ${typeof window !== 'undefined' ? window.location.href : ''}`,
    `錯誤訊息: ${message}`
  ].join('\n');

  const handleCopy = async () => {
    const success = await copyToClipboard(diagnosticsText);
    if (success) {
      setCopied(true);
      showSuccessToast('已复制诊断信息到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } else {
      showErrorToast('复制失败，请手动选择文字');
    }
  };

  const iconName = (() => {
    switch (errorType) {
      case 'network': return 'wifi-off';
      case 'unauthorized': return 'shield-alert';
      case 'not_found': return 'folder-open';
      case 'server': return 'server-crash';
      default: return 'alert-circle';
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
    <div className="flex flex-col items-center justify-center text-center p-8 space-y-7 w-full max-w-sm mx-auto bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 animate-scale-in">
      <div className={cn(
        "inline-flex items-center justify-center w-20 h-20 rounded-full mb-2 transition-transform duration-500 hover:rotate-12",
        errorType === 'network' ? 'bg-amber-50 text-amber-500' : 'bg-red-50 text-red-500'
      )}>
        <Icon name={iconName as IconName} className="w-10 h-10" />
      </div>

      <div className="space-y-3">
        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
          {localized.title}
        </h3>
        <p className="text-base text-slate-500 leading-relaxed max-w-sm mx-auto">
          {localized.message}
        </p>
      </div>

      <div className="flex flex-col w-full gap-3 mt-4">
        <div className="flex items-center gap-3 w-full">
          <button
            type="button"
            onClick={handleActionClick}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all duration-300 shadow-md active:scale-95 cursor-pointer"
          >
            <Icon name="refresh-cw" className="w-4 h-4" />
            {localized.action}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center justify-center gap-1"
        >
          {showDetails ? '隐藏诊断资讯' : '显示诊断资讯'}
          <Icon name={showDetails ? 'chevron-up' : 'chevron-down'} className="w-3 h-3" />
        </button>

        {showDetails && (
          <div className="w-full mt-2 group relative bg-slate-900 rounded-xl p-4 text-left font-mono text-[10px] text-slate-300 border border-slate-800 shadow-inner overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span className="font-bold text-slate-500 text-[9px] uppercase tracking-wider">診斷資訊</span>
              </div>
            </div>
            <div className="space-y-2 opacity-80 break-all max-h-32 overflow-y-auto no-scrollbar">
              {code && (
                <div className="flex flex-col">
                  <span className="text-slate-500">錯誤代碼:</span>
                  <span className="text-slate-300">{code}</span>
                </div>
              )}
              {traceId && (
                <div className="flex flex-col">
                  <span className="text-slate-500">追蹤 ID:</span>
                  <span className="text-slate-300">{traceId}</span>
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-slate-500">錯誤訊息:</span>
                <span className="text-slate-300 whitespace-normal">{message}</span>
              </div>
            </div>
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors border border-slate-700"
              title="複製診斷資訊"
            >
              {copied ? <Icon name="check" className="w-3 h-3 text-emerald-400" /> : <Icon name="copy" className="w-3 h-3" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
