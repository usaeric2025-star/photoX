import React from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { Photo } from '../../types';
import { AppSettings } from '@/types';
import { useTaskExecutor } from '@/hooks/useTaskExecutor';
import { triggerRefreshTagHotScores } from '@/services/tagsMutationService';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  photos: Photo[];
  onHealthCheck: () => Promise<void>;
  onRunMaintenance: () => Promise<void>;
  isChecking: boolean;
  isMaintenanceRunning: boolean;
  cardClass: string;
  buttonStyles: any;
  settings: AppSettings;
  setSettingField: (field: keyof AppSettings, value: any) => void;
  inputClass: string;
}

export const MaintenanceSection: React.FC<Props> = ({ 
  photos, onHealthCheck, onRunMaintenance, isChecking, isMaintenanceRunning, cardClass, buttonStyles,
  settings, setSettingField, inputClass
}) => {
  const { runTask } = useTaskExecutor();
  const queryClient = useQueryClient();

  const handleRefreshHotScores = async () => {
    await runTask('刷新热门标签', async () => {
      await triggerRefreshTagHotScores();
      await queryClient.invalidateQueries({ queryKey: ['tags'] });
    }, { showSuccessToast: true });
  };

  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-brand-gold rounded-full"></div>
          系统管理与维护 / System Maintenance
        </h3>
      </div>
      <p className="text-xs text-brand-navy/60 mb-4 px-2">检测数据健康状况或修复存储库错误。</p>
      
      <div className="space-y-4 mb-6 pt-2 border-t border-brand-navy/5">
        <label className="text-[10px] font-bold text-brand-navy uppercase tracking-widest">热门标签配置 / Hot Tags Config</label>
        
        {/* 热门标签数量 */}
        <div className="space-y-1">
          <label className="text-xs text-brand-navy/70">热门标签显示数量</label>
          <input
            type="number"
            value={settings?.hot_tags_count ?? 9}
            onChange={(e) => setSettingField('hot_tags_count', parseInt(e.target.value) || 9)}
            className={inputClass}
          />
          <p className="text-[10px] text-brand-navy/40">前台显示多少个热门标签</p>
        </div>

        {/* 热门标签阈值 */}
        <div className="space-y-1">
          <label className="text-xs text-brand-navy/70">热门标签热度阈值</label>
          <input
            type="number"
            value={settings?.hot_tag_threshold ?? 10}
            onChange={(e) => setSettingField('hot_tag_threshold', parseInt(e.target.value) || 10)}
            className={inputClass}
          />
          <p className="text-[10px] text-brand-navy/40">热度大于此值才显示热门标签</p>
        </div>
      </div>

      <div className="space-y-2">
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
          onClick={handleRefreshHotScores}
          className={buttonStyles.secondary + " w-full"}
        >
          <RefreshCw size={16} className="mr-2" />
          刷新热门标签 / Refresh Hot Tags
        </button>
      </div>
    </div>
  );
};
