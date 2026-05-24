import React from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { ShieldCheck } from 'lucide-react';
import { Photo } from '../../types';
import { triggerR2Migration, testR2ConnectionStatus } from '@/utils/migrateHelper';

interface Props {
  photos: Photo[];
  onHealthCheck: () => Promise<void>;
  onRunMaintenance: () => Promise<void>;
  onRunMigrationBackground: () => Promise<void>;
  isChecking: boolean;
  isMaintenanceRunning: boolean;
  cardClass: string;
  buttonStyles: any;
}

export const MaintenanceSection: React.FC<Props> = ({ 
  photos, onHealthCheck, onRunMaintenance, onRunMigrationBackground, isChecking, isMaintenanceRunning, cardClass, buttonStyles
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
          onClick={() => {
            testR2ConnectionStatus();
          }}
          className={buttonStyles.secondary + " w-full text-blue-600 border-blue-200 hover:bg-blue-50"}
        >
          🔍 检测 R2 存储连接状态 / Test R2 Status
        </button>

        <button 
          onClick={() => {
            triggerR2Migration();
          }}
          className={buttonStyles.secondary + " w-full text-red-600 border-red-200 hover:bg-red-50 font-bold"}
        >
          🚨 R2 全量迁移 (前台交互)
        </button>

        <button 
          onClick={() => {
            onRunMigrationBackground();
          }}
          className={buttonStyles.secondary + " w-full text-brand-gold border-brand-gold/20 hover:bg-brand-gold/5"}
        >
          ☁️ R2 静默后台迁移 (任务面板模式)
        </button>
      </div>
    </div>
  );
};
