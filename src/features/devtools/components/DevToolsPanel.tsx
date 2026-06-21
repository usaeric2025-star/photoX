import { useLocation } from '@tanstack/react-router';
import { useQueryClient, useIsFetching } from '@tanstack/react-query';
import { useUIStore } from '@/store/useUIStore';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

export function DevToolsPanel() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const isFetching = useIsFetching();
  const { appLang, user } = useUIStore();

  const cacheCount = queryClient.getQueryCache().getAll().length;
  // Make sure we have a getLocalErrors method, or we skip
  const errors = (ErrorFactory as any).getLocalErrors?.() || [];
  const lastError = errors.length > 0 ? errors[errors.length - 1] : null;

  return (
    <div className="space-y-3 text-sm">
      {/* 路由 */}
      <div className="flex items-center justify-between">
        <span className="text-slate-500">📍 路由</span>
        <span className="font-mono text-xs">{location.pathname}</span>
      </div>

      {/* 語言 */}
      <div className="flex items-center justify-between">
        <span className="text-slate-500">🌐 語言</span>
        <span className="font-mono text-xs">{appLang}</span>
      </div>

      {/* 使用者 */}
      <div className="flex items-center justify-between">
        <span className="text-slate-500">👤 使用者</span>
        <span className="font-mono text-xs">{user?.email || '未登入'}</span>
      </div>

      {/* Query 快取 */}
      <div className="flex items-center justify-between">
        <span className="text-slate-500">📦 Query 快取</span>
        <span className="font-mono text-xs">{cacheCount} 個</span>
      </div>

      {/* 進行中請求 */}
      <div className="flex items-center justify-between">
        <span className="text-slate-500">⏳ 進行中請求</span>
        <span className="font-mono text-xs">{isFetching} 個</span>
      </div>

      {/* 操作按鈕 */}
      <div className="flex gap-2 pt-2 border-t border-slate-200">
        <button
          onClick={() => {
             queryClient.clear();
             queryClient.invalidateQueries();
          }}
          className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded transition"
        >
          🗑️ 清除快取
        </button>
        <button
          onClick={() => {
            const info = {
              route: location.pathname,
              lang: appLang,
              user: user?.email,
              cache: cacheCount,
              fetching: isFetching,
              errors: errors.slice(-5),
            };
            navigator.clipboard.writeText(JSON.stringify(info, null, 2));
          }}
          className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded transition"
        >
          📋 複製診斷
        </button>
      </div>

      {/* 最後錯誤 */}
      {lastError && (
        <div className="pt-2 border-t border-slate-200">
          <div className="flex items-center gap-2 text-xs text-red-600">
            <span>⚠️ 最後錯誤</span>
            <span className="text-slate-500">
              {new Date(lastError.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <div className="mt-1 p-2 bg-red-50 text-red-700 rounded text-xs font-mono break-all whitespace-pre-wrap">
            {lastError.message}
          </div>
        </div>
      )}

      {!lastError && (
        <div className="pt-2 border-t border-slate-200 text-xs text-slate-500">
          ✅ 無錯誤記錄
        </div>
      )}
    </div>
  );
}
