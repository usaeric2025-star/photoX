import React from 'react';
import { X, Pin } from 'lucide-react';
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
      "inline-flex items-center gap-1 px-3 h-[22px] rounded-full text-[9px] font-extrabold transition-all border flex items-center shrink-0 whitespace-nowrap",
      pinned 
        ? "border-amber-200 bg-amber-50/90 text-amber-700 shadow-xs"
        : hot 
          ? "border-[#E8BA5A]/50 bg-[#FFF9EA]/80 text-[#B8860B]"
          : selected
            ? 'bg-[#0051BA] border-[#0051BA] text-white shadow-sm'
            : 'bg-[#F1F3F4]/70 border-transparent text-[#888888] hover:bg-[#E8E8E8]'
    )}
  >
    {icon}
    <span>{label}</span>
    {pinned && <Pin size={8} className="fill-current rotate-45" />}
    {hot && !pinned && (
      <span className="text-[7px] font-black px-1 bg-[#FFB700] text-white rounded-[3px] tracking-tighter">
        HOT
      </span>
    )}
    {onRemove && (
      <X size={10} onClick={(e) => { e.stopPropagation(); onRemove(); }} className="ml-1" />
    )}
  </button>
);
