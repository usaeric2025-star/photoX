import { Button } from '@/components/ui/button';
import { Layers, Grid } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GroupToggleProps {
  showGroupsCollapsed: boolean;
  onClick: () => void;
}

export const GroupToggle = ({ showGroupsCollapsed, onClick }: GroupToggleProps) => (
  <Button 
    variant="outline" 
    size="icon" 
    onClick={onClick}
    className={cn(
      "h-8 w-8",
      showGroupsCollapsed ? 'bg-slate-900 text-white' : 'bg-white'
    )}
  >
    {showGroupsCollapsed ? <Layers size={16} /> : <Grid size={16} />}
  </Button>
);
