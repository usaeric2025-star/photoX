import { Button } from '@/components/shared/Button';
import { Icon } from '@/components/ui/Icon';

interface LayoutButtonProps {
  isGrid: boolean;
  onClick: () => void;
}

export const LayoutButton = ({ isGrid, onClick }: LayoutButtonProps) => (
  <Button variant="outline" size="icon" onClick={onClick} className="h-8 w-8">
    {isGrid ? <Icon name="layout-grid" size={16} /> : <Icon name="list" size={16} />}
  </Button>
);
