import React, { Suspense } from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { useAdminActions } from '#src/hooks/admin/index.js';
import { Button } from '#src/components/ui/Button.js';
import { LoadingScreen } from '#src/components/ui/LoadingScreen.js';
import { LoadingSpinner } from '#src/components/ui/feedback/LoadingSpinner.js';
import { useAppLocation, useTranslation, useUI } from '#src/hooks/index.js';
import { ADMIN_ROUTES } from '#src/constants/config.js';

import { ErrorLogViewer } from './ErrorLogViewer.js';
import { MaintenanceCenter } from './MaintenanceCenter.js';
import { TasksContent } from './TasksList.js';
const StatisticsScreen = React.lazy(() => import('../statistics/components/StatisticsScreen.js').then(m => ({ default: m.StatisticsScreen })));

/**
 * DiagDashboard
 * 
 * 系統診斷與維護儀錶盤，提供統計、修復工具、任務管理與錯誤日誌。
 */
export function DiagDashboard() {
  const { t } = useTranslation();
  const { tab, setTab } = useUI();
  const [location, setLocation] = useAppLocation();
  
  const activeTab = (() => {
    if (location.startsWith(ADMIN_ROUTES.TASKS)) return 'tasks';
    if (location.startsWith(ADMIN_ROUTES.ERROR_LOGS)) return 'logs';
    return tab;
  })();

  const setActiveTab = (newTab: 'diagnosis' | 'tasks' | 'logs' | 'stats') => {
    if (newTab === 'tasks') {
      setLocation(ADMIN_ROUTES.TASKS);
    } else if (newTab === 'logs') {
      setLocation(ADMIN_ROUTES.ERROR_LOGS);
    } else {
      if (!location.startsWith(ADMIN_ROUTES.DIAGNOSTICS)) {
        setLocation(ADMIN_ROUTES.DIAGNOSTICS);
      }
      setTab(newTab === 'stats' ? null : newTab);
    }
  };

  const { isAuditing: isPending, refreshReport, runAudit } = useAdminActions();
  const isStandalone = location.startsWith('/diagnostics');

  return (
    <div className={isStandalone ? "h-screen overflow-y-auto w-full px-6 md:px-8 py-8 pb-32 no-scrollbar max-w-7xl mx-auto space-y-8 bg-slate-50 " : "space-y-8 "}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isStandalone && (
            <button 
              onClick={() => setLocation(ADMIN_ROUTES.HOME)}
              className="p-2 mr-1 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-900"
              title={t('backToAdmin')}
            >
              <Icon name="arrow-left" size={20} />
            </button>
          )}
          <Icon name="shield-check" className="w-8 h-8 text-blue-900" />
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black text-blue-900 tracking-tight uppercase">{t('systemMaintCenter')}</h1>
            <p className="text-xs text-slate-500 font-medium">SYSTEM MAINTENANCE & RECOVERY HUB</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
             {([
               { id: 'stats', label: `${t('dataOverview')} / Stats` },
               { id: 'diagnosis', label: `${t('diagnosisAndRepair')} / Repair` },
               { id: 'tasks', label: `${t('taskCenter')} / Tasks` },
               { id: 'logs', label: `${t('systemLogs')} / Logs` }
             ] as const).map(tabItem => (
               <button
                 key={tabItem.id}
                 onClick={() => setActiveTab(tabItem.id)}
                 className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${
                   activeTab === tabItem.id 
                    ? 'bg-white text-blue-900 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                 }`}
               >
                 {tabItem.label}
               </button>
             ))}
          </div>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => {
              if (activeTab === 'diagnosis' || activeTab === 'stats') {
                refreshReport();
                runAudit();
              }
            }}
            loading={isPending}
            className="rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors h-9 w-9 shrink-0"
          >
            <Icon name="refresh-cw" size={16} className="text-slate-500" />
          </Button>
        </div>
      </div>

      <div className="relative">
        {activeTab === 'stats' && (
          <div className="">
            <Suspense fallback={<LoadingSpinner size="lg" className="mx-auto my-20" />}>
              <StatisticsScreen />
            </Suspense>
          </div>
        )}
        {activeTab === 'diagnosis' && (
          <div className="space-y-8 ">
            <MaintenanceCenter 
              onSuccess={refreshReport} 
            />
          </div>
        )}
        {activeTab === 'tasks' && (
          <div className="">
            <TasksContent />
          </div>
        )}
        {activeTab === 'logs' && (
          <div className="">
            <ErrorLogViewer />
          </div>
        )}
      </div>
    </div>
  );
}
