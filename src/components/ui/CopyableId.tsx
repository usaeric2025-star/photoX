import React from 'react';
import { Copy, Check } from '@react-zero-ui/icon-sprite';
import { cn } from '@/lib/utils';
import { useCopyToClipboard } from '@/hooks';

interface CopyableIdProps {
  id: string;
  label?: string;
  className?: string;
}

export function CopyableId({ id, label, className }: CopyableIdProps) {
  const { copy, copied } = useCopyToClipboard({ showToast: false });

  if (!id) return null;

  const displayId = id.length > 16 
    ? `${id.slice(0, 8)}...${id.slice(-4)}`
    : id;

  return (
    <div className={cn("flex items-center gap-1.5", className)} title={`ID: ${id}`}>
      {label && <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{label}</span>}
      <code className="text-[10px] font-mono text-slate-500 bg-slate-100/80 px-1.5 py-0.5 rounded border border-slate-200/50 select-all">
        {displayId}
      </code>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          copy(id);
        }}
        className="text-slate-400 hover:text-brand-navy p-1 transition-colors rounded-md hover:bg-slate-100 touch-manipulation cursor-pointer"
      >
        {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
      </button>
    </div>
  );
}
