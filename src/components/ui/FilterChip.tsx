import React from 'react';
import { X, Pin } from '@react-zero-ui/icon-sprite';
import { cn } from '@/lib/utils';

interface FilterChipProps {
  label: string;
  selected?: boolean;
  pinned?: boolean;
  hot?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  icon?: React.ReactNode;
}

export const FilterChip = ({ label, selected, pinned, hot, onClick, onRemove, icon }: FilterChipProps) => (
  <button
    onClick={onClick}
    className={cn(
      "inline-flex items-center gap-1 px-3 h-[24px] rounded-full text-[10px] font-bold transition-all border flex items-center shrink-0 whitespace-nowrap",
      selected
        ? "bg-[#1a1c3e] border-[#1a1c3e] text-white shadow-sm"
        : pinned 
          ? "border-amber-400 bg-amber-50 text-amber-900 shadow-sm"
          : hot 
            ? "border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-400"
            : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
    )}
  >
    {icon}
    <span>{label}</span>
    {pinned && <Pin size={8} className="fill-current rotate-45" />}
    {hot && !pinned && (
      <span className="text-[7px] font-black px-1 py-0.5 bg-amber-500 text-white rounded-[3px] shadow-sm">
        HOT
      </span>
    )}
    {onRemove && (
      <X size={10} onClick={(e) => { e.stopPropagation(); onRemove(); }} className="ml-1" />
    )}
  </button>
);
