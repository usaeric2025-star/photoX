import { cn } from '@/lib/utils';

interface SubCategoryChipProps {
  name: string;
  selected: boolean;
  onClick: () => void;
}

export const SubCategoryChip = ({ name, selected, onClick }: SubCategoryChipProps) => (
  <button
    onClick={onClick}
    className={cn(
      "h-[28px] px-3 rounded-[6px] text-[11px] font-medium transition-all border whitespace-nowrap",
      selected
        ? "bg-slate-800 border-slate-800 text-white"
        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
    )}
  >
    {name}
  </button>
);
