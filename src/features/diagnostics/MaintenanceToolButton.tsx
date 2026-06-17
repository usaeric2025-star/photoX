import React from 'react';

interface ToolButtonProps {
  title: string;
  desc: string;
  icon: React.ReactNode;
  onClick: () => void;
  loading: boolean;
  color: 'blue' | 'green' | 'red' | 'navy' | 'purple' | 'indigo' | 'orange' | 'amber';
}

/**
 * [ATOMIC-COMPONENT] MaintenanceToolButton
 * Standard button for maintenance actions in admin dashboard
 */
export function MaintenanceToolButton({ title, desc, icon, onClick, loading, color }: ToolButtonProps) {
  const colorMap = {
    blue: 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-100',
    green: 'bg-green-50 hover:bg-green-100 text-green-600 border-green-100',
    red: 'bg-red-50 hover:bg-red-100 text-red-600 border-red-100',
    navy: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200',
    purple: 'bg-purple-50 hover:bg-purple-100 text-purple-600 border-purple-100',
    indigo: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-indigo-100',
    orange: 'bg-orange-50 hover:bg-orange-100 text-orange-600 border-orange-100',
    amber: 'bg-amber-50 hover:bg-amber-100 text-amber-600 border-amber-100',
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex flex-col gap-2 p-4 rounded-2xl border transition-all active:scale-95 text-left group ${colorMap[color]} disabled:opacity-50`}
    >
      <div className="flex items-center gap-2">
        <div className="p-2 bg-white/50 rounded-lg shadow-sm">
          {icon}
        </div>
        <span className="text-xs font-black tracking-tight">{title}</span>
      </div>
      <p className="text-[9px] opacity-70 uppercase font-bold tracking-wider leading-tight">{desc}</p>
      {loading && (
        <div className="mt-1 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
          <span className="text-[10px] font-black animate-pulse uppercase">处理中...</span>
        </div>
      )}
    </button>
  );
}
