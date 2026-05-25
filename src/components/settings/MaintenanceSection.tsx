import React, { useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { ShieldCheck, ChevronDown, ChevronUp, Database, PackageSearch, Activity } from 'lucide-react';
import { Photo } from '../../types';
import { triggerR2Migration, testR2ConnectionStatus, checkR2Inventory, checkMigrationStats, verifyPhysicalR2Files } from '@/utils/migrateHelper';
import { useTaskExecutor } from '@/hooks/core/useTaskExecutor';
import { useFeedback } from '@/hooks/shared/useFeedback';
import { useGalleryStore } from '@/store';

interface Props {
  onHealthCheck: () => Promise<void>;
  isChecking: boolean;
  cardClass: string;
  buttonStyles: any;
}

export const MaintenanceSection: React.FC<Props> = ({ 
  onHealthCheck, isChecking, cardClass, buttonStyles
}) => {
  const { runTask } = useTaskExecutor();
  const { showError } = useFeedback();
  const { setAlertDialog } = useGalleryStore();
  const { showSuccess } = useFeedback();

  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-brand-gold rounded-full"></div>
          系统维护中心 / System Maintenance
        </h3>
      </div>
      
      <div className="space-y-3">
        <button 
          onClick={onHealthCheck}
          disabled={isChecking}
          className={buttonStyles.secondary + " w-full justify-start gap-3"}
        >
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShieldCheck size={16} />
          </div>
          <div className="text-left">
            <p className="text-[11px] font-bold text-slate-700">数据库一致性检查</p>
            <p className="text-[10px] text-slate-400 font-medium">诊断数据库资产与存储链接</p>
          </div>
          {isChecking && <Spinner size="sm" className="ml-auto" />}
        </button>

        <button 
          onClick={() => checkMigrationStats()}
          className={buttonStyles.secondary + " w-full justify-start gap-3"}
          >
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Activity size={16} />
          </div>
          <div className="text-left">
            <p className="text-[11px] font-bold text-slate-700">迁移状态对账</p>
            <p className="text-[10px] text-slate-400 font-medium">查看当前与云端同步报告</p>
          </div>
        </button>

        <button 
           onClick={async () => {
             await runTask('R2 存储对账', async () => {
               const response = await fetch('/api/storage/audit');
               const result = await response.json();
               if (result.missing > 0 || result.orphans > 0) {
                 setAlertDialog({
                   title: '对账报告',
                   message: `✅ 正常: ${result.healthy}\n❌ 缺失: ${result.missing}\n🗑️ 孤儿: ${result.orphans}`,
                 });
               } else {
                 showSuccess('存储对账完成，一切正常');
               }
             });
           }}
           className={buttonStyles.secondary + " w-full justify-start gap-3"}
         >
           <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-600 flex items-center justify-center">
             <PackageSearch size={16} />
           </div>
           <div className="text-left">
             <p className="text-[11px] font-bold text-slate-700">🔍 R2 存储对账</p>
             <p className="text-[10px] text-slate-400 font-medium">检查数据库与R2文件一致性</p>
           </div>
         </button>

        <button 
          onClick={() => triggerR2Migration({ force: true })}
          className={buttonStyles.accent + " w-full justify-start gap-3"}
        >
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center">
            <Database size={16} />
          </div>
          <div className="text-left">
            <p className="text-[11px] font-bold text-slate-900">执行全量迁移修复</p>
            <p className="text-[10px] text-slate-500 font-medium">强制对所有资产进行云端同步</p>
          </div>
        </button>
      </div>
    </div>
  );
};

