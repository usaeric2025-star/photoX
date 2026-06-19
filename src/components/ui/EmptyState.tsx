import React from 'react';
import { Ghost } from '@react-zero-ui/icon-sprite';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ 
  title, 
  description, 
  icon = <Ghost className="w-16 h-16 text-slate-200" />, 
  action,
  className 
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-20 px-8 text-center bg-white/50 backdrop-blur-sm rounded-[3rem] border border-slate-100 shadow-sm mx-auto max-w-lg", className)}>
      <div className="mb-6 p-6 bg-slate-50 rounded-full ring-8 ring-slate-50/50 animate-in zoom-in-50 duration-500">{icon}</div>
      <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
      {description ? (
        <p className="mt-2 text-slate-500 font-medium leading-relaxed">{description}</p>
      ) : null}
      {action ? <div className="mt-8">{action}</div> : null}
    </div>
  );
};
