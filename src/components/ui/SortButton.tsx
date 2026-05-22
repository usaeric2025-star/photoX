import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';

interface SortButtonProps {
  onClick: () => void;
  label?: string;
}

export const SortButton = ({ onClick, label = "排序" }: SortButtonProps) => (
  <Button variant="outline" size="sm" onClick={onClick} className="h-8 gap-1.5">
    <ArrowUpDown size={14} />
    {label}
  </Button>
);
