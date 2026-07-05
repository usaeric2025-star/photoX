import React from 'react';
import { cn } from '#lib/utils.js';
import { Icon } from '#src/components/ui/Icon.js';

interface SidebarItemProps {
  icon: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: string | number;
  className?: string;
  collapsed?: boolean;
}

export function SidebarItem({
  icon,
  label,
  active,
  onClick,
  badge,
  className,
  collapsed
}: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 outline-none w-full",
        active 
          ? "bg-slate-100 text-slate-900 font-medium shadow-sm" 
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
        className
      )}
    >
      <div className={cn(
        "flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110",
        active ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
      )}>
        <Icon name={icon as any} size={20} />
      </div>
      
      {!collapsed && (
        <span className="truncate text-sm">{label}</span>
      )}

      {badge !== undefined && badge !== null && !collapsed && (
        <span className="ml-auto text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md min-w-[1.25rem] text-center">
          {badge}
        </span>
      )}

      {collapsed && active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
      )}
      
      {collapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100] shadow-xl">
          {label}
        </div>
      )}
    </button>
  );
}
