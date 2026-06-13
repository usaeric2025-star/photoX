import { createRouter } from '@tanstack/react-router';
import { rootRoute } from './root';
import { indexRoute, previewRoute, hashRoute, groupRoute, gRoute } from './public';
import { adminRoute, adminDiagnoseRoute, adminDiagnosticsRoute, adminTasksRoute, adminErrorLogsRoute, adminGroupRoute, adminSettingsRoute, adminBatchEditRoute, adminStatisticsRoute } from './admin';
import { parseSearch, stringifySearch } from './utils';
import { NotFoundPage } from '@/pages/NotFoundPage';

export const routeTree = rootRoute.addChildren([
  indexRoute,
  previewRoute,
  hashRoute,
  groupRoute,
  gRoute,
  adminGroupRoute,
  adminRoute.addChildren([
    adminDiagnoseRoute,
    adminDiagnosticsRoute,
    adminTasksRoute,
    adminErrorLogsRoute,
    adminSettingsRoute,
    adminBatchEditRoute,
    adminStatisticsRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFoundPage,
  defaultErrorComponent: ({ error, reset }) => {
    const isChunkFailure = error instanceof Error && 
      (error.message.includes('Failed to fetch dynamically imported module') || 
       error.message.includes('Loading chunk'));

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-800 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {isChunkFailure ? '发现新版本 / New Version' : '路由错误 / Route Error'}
          </h1>
          <p className="text-slate-500 mb-8 max-w-xs break-words">
            {isChunkFailure 
              ? '为了为您提供最新功能，系统需要重新加载以完成更新。 / System requires a reload to apply updates.'
              : (error instanceof Error ? error.message : '发生了未知的路由错误')}
          </p>
          <button
            onClick={() => isChunkFailure ? window.location.reload() : reset()}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-medium tracking-wide hover:bg-slate-800 transition-all active:scale-[0.98]"
          >
            {isChunkFailure ? '立即更新 / Update Now' : '重试 / Retry'}
          </button>
        </div>
      </div>
    );
  },
  defaultPreload: 'intent',
  parseSearch,
  stringifySearch,
  context: {
    user: null,
    role: 'guest',
    can: () => false,
    availableActions: [],
  },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
