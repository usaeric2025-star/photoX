import { cn } from '@/lib/utils';

interface CategoryChipProps {
  name: string;
  selected: boolean;
  onClick: () => void;
}

export const CategoryChip = ({ name, selected, onClick }: CategoryChipProps) => (
  <button
    onClick={onClick}
    className={cn(
      "h-[32px] px-3 rounded-[8px] text-[12px] font-bold transition-all border whitespace-nowrap",
      selected
        ? "bg-[#1a1c3e] border-[#1a1c3e] text-white shadow-sm"
        : "bg-white border-[#e2e8f0] text-[#0f172a] hover:bg-[#f8fafc] hover:border-[#cbd5e1]"
    )}
  >
    {name}
  </button>
);
