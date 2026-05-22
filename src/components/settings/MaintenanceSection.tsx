import React from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { Photo } from '../../types';
import { useTaskExecutor } from '@/hooks/useTaskExecutor';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

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
  const { runTask } = useTaskExecutor();
  const queryClient = useQueryClient();

  const handleRefreshHotScores = async () => {
    await runTask('刷新热门标签', async () => {
      await supabase.rpc('refresh_tag_hot_scores');
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
