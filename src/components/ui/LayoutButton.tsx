import { Button } from '@/components/ui/button';
import { LayoutGrid, List } from 'lucide-react';

interface LayoutButtonProps {
  isGrid: boolean;
  onClick: () => void;
}

export const LayoutButton = ({ isGrid, onClick }: LayoutButtonProps) => (
  <Button variant="outline" size="icon" onClick={onClick} className="h-8 w-8">
    {isGrid ? <LayoutGrid size={16} /> : <List size={16} />}
  </Button>
);
