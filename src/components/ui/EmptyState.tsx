import React from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { cn } from '#lib/utils.js';
import { motion } from 'lite-sleek';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode | { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ 
  title, 
  description, 
  icon = <Icon name="ghost" className="w-16 h-16 text-slate-200" />, 
  action,
  className 
}: EmptyStateProps) {
  const renderAction = () => {
    if (!action) return null;
    if (React.isValidElement(action)) return action;
    if (typeof action === 'object' && 'label' in action) {
      return (
        <button 
          onClick={action.onClick}
          className="px-6 py-3 bg-brand-primary text-white font-bold rounded-full hover:bg-brand-primary-dark transition-all shadow-lg active:scale-95"
        >
          {action.label}
        </button>
      );
    }
    return null;
  };

  return (
    <motion.div 
      variant="scale" 
      transition="easeOut"
      className={cn("flex flex-col items-center justify-center py-20 px-8 text-center bg-white/50 backdrop-blur-sm rounded-[3rem] border border-slate-100 shadow-sm mx-auto max-w-lg", className)}
    >
      <div className="mb-6 p-6 bg-slate-50 rounded-full ring-8 ring-slate-50/50">{icon}</div>
      <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
      {description ? (
        <p className="mt-2 text-slate-500 font-medium leading-relaxed">{description}</p>
      ) : null}
      <div className="mt-8">{renderAction()}</div>
    </motion.div>
  );
}
