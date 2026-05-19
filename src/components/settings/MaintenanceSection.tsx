import React from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { Photo } from '../../types';

interface Props {
  photos: Photo[];
  onHealthCheck: () => Promise<void>;
  isChecking: boolean;
  cardClass: string;
  buttonStyles: any;
}

export const MaintenanceSection: React.FC<Props> = ({ 
  photos, onHealthCheck, isChecking, cardClass, buttonStyles 
}) => {
  return (
    <div className={cardClass}>
      <h3 className="text-sm font-bold text-brand-navy flex items-center gap-2">
        <ShieldCheck size={18} className="text-brand-gold" />
        系统健康诊断 / System Health Check
      </h3>
      <p className="text-xs text-brand-navy/60">检测前端缓存和数据一致性。</p>
      
      <button 
        onClick={onHealthCheck}
        disabled={isChecking}
        className={buttonStyles.secondary + " w-full"}
      >
        {isChecking ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
        {isChecking ? '诊断中...' : '运行一键检测 / Run Health Check'}
      </button>
    </div>
  );
};
