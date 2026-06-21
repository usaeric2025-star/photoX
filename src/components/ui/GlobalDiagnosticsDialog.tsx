import React, { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { NativeDialog } from '@/components/ui/NativeDialog';
import { logger } from '@/lib/logger';
import { clearCacheAndReload } from '@/lib/recovery/clearCacheAndReload';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

import { copyToClipboard } from '@/utils/clipboard';

interface GlobalDiagnosticsDialogProps {
  open: boolean;
  onClose: () => void;
}

interface DiagnosticError {
  type: string;
  msg: string;
  details: string;
  traceId: string;
  code: string;
  timestamp: string;
}

export function GlobalDiagnosticsDialog({ open, onClose }: GlobalDiagnosticsDialogProps) {
  const [networkStatus, setNetworkStatus] = useState<'checking' | 'connected' | 'failed'>('checking');
  const [latency, setLatency] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<DiagnosticError[]>([]);

  // 捕獲當前的啟動和運行期錯誤
  useEffect(() => {
    if (open) {
      const startupErrors = (window as any).__STARTUP_ERRORS__ || [];
      const cachedErrors = ErrorFactory.getLocalErrors();
      
      // 合併並去重 (基於 traceId)
      const allErrors: DiagnosticError[] = [...startupErrors];
      cachedErrors.forEach((ce) => {
        if (!allErrors.find(ae => ae.traceId === ce.traceId)) {
          allErrors.push({
            type: String(ce.category || 'Error'),
            msg: String(ce.message || 'Unknown error'),
            details: ce.context ? JSON.stringify(ce.context) : String(ce.stack || ''),
            traceId: String(ce.traceId || ''),
            code: String(ce.code || 'UNKNOWN'),
            timestamp: String(ce.timestamp || '')
          });
        }
      });

      setErrors(allErrors.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      
      // 進行網路診斷
      checkBackendConnection();
    }
  }, [open]);

  // 測試後端 API 連線與延遲
  const checkBackendConnection = async () => {
    setNetworkStatus('checking');
    const start = performance.now();
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000);
      
      // 添加隨機參數防快取
      const res = await fetch(`/api/health?t=${Date.now()}`, { signal: controller.signal });
      clearTimeout(id);
      
      const end = performance.now();
      if (res.ok) {
        setLatency(Math.round(end - start));
        setNetworkStatus('connected');
      } else {
        throw new Error(`Health check failed: ${res.status}`);
      }
    } catch (e) {
      logger.error('[Diagnostics] Connection test failed:', e);
      setNetworkStatus('failed');
      setLatency(null);
    }
  };

  // 一鍵清理硬體快取與重啟
  const handleClearCacheAndRestart = () => {
    clearCacheAndReload();
  };

  // 構造完整的診斷日誌文字供複製
  const getFullDiagnosticText = () => {
    const timestamp = new Date().toISOString();
    const traceId = `TRACE-DIA-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const url = window.location.href;
    const errorCode = errors.length > 0 ? (errors[0].code || 'ERR-RUNTIME-500') : 'NONE';

    const storageEstimates = typeof navigator.storage !== 'undefined' ? 'Supported' : 'Not supported';
    const currentErrors = errors.map((e, index) => {
      return `${index + 1}. [${e.type || 'Error'}] code: ${e.code || 'UNKNOWN'} | ${e.msg}\n${e.details || ''}`;
    }).join('\n---\n');

    return [
      `--- PHOTX 系統核心診斷報告 (Diagnostic Report) ---`,
      `[標準診斷欄位]`,
      `traceId: ${traceId}`,
      `errorCode: ${errorCode}`,
      `timestamp: ${timestamp}`,
      `url: ${url}`,
      `---------------------------------`,
      `[設備與狀態詳情]`,
      `瀏覽器 Agent: ${navigator.userAgent}`,
      `語言設定: ${navigator.language}`,
      `螢幕解析度: ${window.innerWidth}x${window.innerHeight}`,
      `連線測試: ${networkStatus === 'connected' ? `成功 (連線延遲 ${latency}ms)` : networkStatus === 'checking' ? '檢測中' : '連線逾時/失敗'}`,
      `Storage API Support: ${storageEstimates}`,
      `本機快取 Keys 數量: ${Object.keys(localStorage).length}`,
      `---------------------------------`,
      `系統已捕獲異常日誌 (${errors.length} 筆):\n${currentErrors || '（無未捕獲之全域異常）'}`,
      `---------------------------------`
    ].join('\n');
  };

  const handleCopy = () => {
    const text = getFullDiagnosticText();
    copyToClipboard(text, { successMessage: '診斷報告已複製' });
  };

  return (
    <NativeDialog
      id="global-diagnostics-dialog"
      open={open}
      onClose={onClose}
      title="系統除錯診斷與維護"
      size="md"
    >
      <div className="bg-white flex flex-col h-full max-h-[85vh]">
        {/* Header Section */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-150 text-slate-800">
              <Icon name="terminal" size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-none">系統除錯診斷與維護</h3>
              <p className="text-[10px] text-slate-400 mt-1 font-mono tracking-widest uppercase">System Diagnostics Panel</p>
            </div>
          </div>
        </div>

        {/* Content Section (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {/* Status Quick Checks */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">後端 API 連線</span>
              <div className="flex items-center gap-2">
                {networkStatus === 'checking' && (
                  <>
                    <Icon name="refresh-cw" size={14} className="text-slate-400 animate-spin" />
                    <span className="text-xs font-semibold text-slate-600">檢測中...</span>
                  </>
                )}
                {networkStatus === 'connected' && (
                  <>
                    <Icon name="wifi" size={16} className="text-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-slate-800">連線暢通 ({latency}ms)</span>
                  </>
                )}
                {networkStatus === 'failed' && (
                  <>
                    <Icon name="wifi-off" size={16} className="text-red-500 animate-bounce" />
                    <span className="text-xs font-semibold text-red-600">連線中斷 / 逾時</span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">當前異常記錄</span>
              <div className="flex items-center gap-2">
                <Icon name="alert-triangle" size={15} className={errors.length > 0 ? 'text-amber-500' : 'text-slate-400'} />
                <span className="text-xs font-semibold text-slate-700">
                  {errors.length > 0 ? `${errors.length} 個異常待排查` : '無捕獲異常 (良好)'}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Logs Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">故障與事件堆疊 (Debug Logs)</span>
              {errors.length > 0 && (
                <button 
                  onClick={() => {
                    setErrors([]);
                    ErrorFactory.clearLocalErrors();
                  }}
                  className="text-[10px] text-slate-400 hover:text-slate-600 active:scale-95 transition-all flex items-center gap-1"
                >
                  <Icon name="trash-2" size={10} />
                  清空列表
                </button>
              )}
            </div>
            
            <div className="bg-slate-950 rounded-2xl border border-slate-900 p-4 font-mono text-[11px] leading-relaxed text-slate-300">
              {errors.length === 0 ? (
                <div className="text-center py-6 text-slate-500 block">
                  ~ 當前無異常事件，系統組件已正常掛載 ~
                </div>
              ) : (
                <div className="space-y-4 max-h-[160px] overflow-y-auto pr-1">
                  {errors.map((e, i) => (
                    <div key={i} className="space-y-1.5 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="text-red-400 font-bold tracking-wide">
                          #{i + 1} {e.type || 'Runtime Exception'}
                        </span>
                      </div>
                      <p className="text-slate-200 font-sans text-xs font-semibold break-all">{e.msg}</p>
                      {e.details && (
                        <p className="text-slate-500 whitespace-pre-wrap break-all text-[9.5px] max-h-24 overflow-y-auto leading-normal bg-white/5 p-2 rounded-lg mt-1">
                          {e.details}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* User Instructions / Fix Hints */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs text-slate-500 leading-relaxed space-y-1.5">
            <span className="font-bold text-slate-700 block">💡 自行排查小秘訣：</span>
            <p>1. 如果看到空白骨架、按鈕點擊無反應，通常是防護機制或舊版組件在快取中衝突。</p>
            <p>2. 點擊下方的「一鍵徹底清除快取並修復」可以移除流覽器本地暫存與模組錯誤，效果最佳。</p>
            <p>3. 複製診斷報告可以將錯誤詳情提供給管理人員或開發人員。</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-5 border-t border-slate-100 shrink-0 flex flex-col sm:flex-row gap-3 bg-slate-50/50">
          <button
            onClick={handleClearCacheAndRestart}
            className="flex-1 px-5 py-3 bg-red-600 hover:bg-red-750 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-red-200 cursor-pointer"
          >
            <Icon name="trash-2" size={14} />
            一鍵徹底清除快取並修復
          </button>
          
          <button
            onClick={handleCopy}
            className={`flex-1 px-5 py-3 border rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
              copied 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm' 
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {copied ? <Icon name="check" size={14} className="animate-pulse" /> : <Icon name="copy" size={14} />}
            {copied ? '診斷報告已複製' : '一鍵複製診斷報告'}
          </button>
        </div>
      </div>
    </NativeDialog>
  );
}
