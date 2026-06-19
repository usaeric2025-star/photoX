import { Button } from '@/components/shared/Button';
import { ArrowUpDown } from '@react-zero-ui/icon-sprite';

interface SortButtonProps {
  onClick: () => void;
  label?: string;
  selected?: boolean;
}

export const SortButton = ({ onClick, label = "排序", selected }: SortButtonProps) => (
  <Button 
    variant={selected ? "primary" : "outline"} 
    size="sm" 
    onClick={onClick} 
    className="h-8 gap-1.5 active:scale-95 transition-transform duration-75"
  >
    <ArrowUpDown size={14} />
    {label}
  </Button>
);
