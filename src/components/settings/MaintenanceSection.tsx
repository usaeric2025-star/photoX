import React from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { ShieldCheck } from 'lucide-react';
import { Photo } from '../../types';

interface Props {
  photos: Photo[];
  onHealthCheck: () => Promise<void>;
  onRunMaintenance: () => Promise<void>;
  isChecking: boolean;
  isMaintenanceRunning: boolean;
  cardClass: string;
  buttonStyles: any;
}

export const MaintenanceSection: React.FC<Props> = ({ 
  photos, onHealthCheck, onRunMaintenance, isChecking, isMaintenanceRunning, cardClass, buttonStyles
}) => {
  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-brand-gold rounded-full"></div>
          系统管理与维护 / System Maintenance
        </h3>
      </div>
      <p className="text-xs text-brand-navy/60 mb-4 px-2">检测数据健康状况或修复存储库错误。</p>

      <div className="space-y-4 pt-2 border-t border-brand-navy/5">
        <button 
          onClick={onHealthCheck}
          disabled={isChecking || isMaintenanceRunning}
          className={buttonStyles.secondary + " w-full"}
        >
          {isChecking ? <Spinner size="sm" className="text-current" /> : <ShieldCheck size={16} />}
          {isChecking ? '诊断中...' : '运行一键检测 / Run Health Check'}
        </button>

        <button 
          onClick={onRunMaintenance}
          disabled={isChecking || isMaintenanceRunning}
          className={buttonStyles.secondary + " w-full"}
        >
          {isMaintenanceRunning ? <Spinner size="sm" className="text-current" /> : <ShieldCheck size={16} />}
          {isMaintenanceRunning ? '修复中...' : '修复缩略图 / Repair Thumbnails'}
        </button>

        <button 
          onClick={async () => {
             try {
               const confirmed = window.confirm('该操作将执行后台 R2 迁移脚本和数据库 URL 更新脚本。是否继续？\n过程中需要保持后端的执行状态，并可在终端查看进度。');
               if (!confirmed) return;
               const { toast } = await import('sonner');
               const toastId = toast.loading('正在执行 R2 迁移 (步骤 1和2)...');
               const res = await fetch('/api/migrate-r2', { method: 'POST' });
               if (res.ok) {
                  const result = await res.json();
                  console.log("Migration Success Log:", result);
                  toast.success('迁移执行完成', { description: '成功，详细日志已输出到控制台。', id: toastId, duration: 10000 });
               }
               else {
                  let errStr = await res.text();
                  try {
                      const errJson = JSON.parse(errStr);
                      errStr = `Error: \${errJson.message}\n\nSTDOUT:\n\${errJson.stdout || ''}\n\nSTDERR:\n\${errJson.stderr || ''}`;
                  } catch(e) {}
                  console.error("Migration Failed:", errStr);
                  window.alert('迁移执行失败，完整日志请查看控制台 (F12) 的 Console 面板。\n\n部分日志:\n' + errStr.substring(0, 500) + (errStr.length > 500 ? '...' : ''));
                  toast.error('迁移执行失败', { description: '请查看控制台日志', id: toastId, duration: 10000 });
               }
             } catch (err: any) {
               const { toast } = await import('sonner');
               toast.error('请求网络报错', { description: err.message });
             }
          }}
          className={buttonStyles.secondary + " w-full text-red-600 border-red-200 hover:bg-red-50"}
        >
          🚨 临时 R2 数据与URL迁移
        </button>
      </div>
    </div>
  );
};
