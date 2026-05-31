import React from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { ShieldCheck, PackageSearch, Trash2 } from 'lucide-react';
import { useTaskExecutor } from '@/hooks/core/infra/useTaskExecutor';
import { useFeedback } from '@/hooks';
import { useGalleryStore } from '@/store/galleryStore';
import { api } from '@/lib/api';

interface Props {
  onHealthCheck: () => Promise<void>;
  isChecking: boolean;
  cardClass: string;
  buttonStyles: { primary: string; secondary: string; accent: string };
}

export function MaintenanceSection({ 
  onHealthCheck, isChecking, cardClass, buttonStyles
}: Props) {
  const { runTask } = useTaskExecutor();
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
           onClick={async () => {
             await runTask('R2 存储对账', async () => {
               const response = await api.storage.audit.$get();
               const result = await response.json();
               if (!result.success) throw new Error('Audit failed');
               const data = result.data;
               if (data.missing > 0 || data.orphans > 0) {
                 setAlertDialog({
                   title: '对账报告 / Audit Report',
                   message: `✅ 正常/Healthy: ${data.healthy}\n❌ 缺失/Missing in R2: ${data.missing}\n🗑️ 孤儿/Orphans in R2: ${data.orphans}`,
                   onConfirm: () => setAlertDialog(null),
                   confirmLabel: 'OK'
                 });
               } else {
                 showSuccess('存储对账完成，一致性完美匹配 / Storage consistency verified! All good.');
               }
             });
           }}
           className={buttonStyles.secondary + " w-full justify-start gap-3"}
         >
           <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
             <PackageSearch size={16} />
           </div>
           <div className="text-left">
             <p className="text-[11px] font-bold text-slate-700">🔍 R2 存储对账</p>
             <p className="text-[10px] text-slate-400 font-medium">检查数据库记录与 R2 文件一致性</p>
           </div>
         </button>

        <button 
           onClick={async () => {
             await runTask('清理孤儿文件', async () => {
               const response = await api.storage.clean.$post();
               const result = await response.json();
               if (!result.success) throw new Error('Clean failed');
               const data = result.data;
               if (data.cleanedCount > 0) {
                 setAlertDialog({
                   title: '清理报告 / Cleanup Report',
                   message: `🗑️ 成功清理了 ${data.cleanedCount} 个 R2 孤儿物理文件！\n\nSwiped clean ${data.cleanedCount} unused assets in R2 root directory.`,
                   onConfirm: () => setAlertDialog(null),
                   confirmLabel: 'OK'
                 });
               } else {
                 showSuccess('未发现多余的 R2 孤儿文件，一切洁净！ / Storage is already 100% clean.');
               }
             });
           }}
           className={buttonStyles.secondary + " w-full justify-start gap-3"}
         >
           <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
             <Trash2 size={16} />
           </div>
           <div className="text-left">
             <p className="text-[11px] font-bold text-slate-700">🗑️ 清理 R2 孤儿文件</p>
             <p className="text-[10px] text-slate-400 font-medium">物理擦除 R2 存储桶内无主垃圾资产</p>
           </div>
         </button>
      </div>
    </div>
  );
};


