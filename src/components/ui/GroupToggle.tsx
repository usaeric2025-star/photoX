import { Button } from '@/components/shared/Button';
import { Layers, Grid } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GroupToggleProps {
  showGroupsCollapsed: boolean;
  onClick: () => void;
}

export const GroupToggle = ({ showGroupsCollapsed, onClick }: GroupToggleProps) => (
  <Button 
    id="group-toggle-btn"
    variant="outline" 
    size="icon" 
    onClick={onClick}
    className={cn(
      "h-8 w-8 transition-transform duration-200 ease-in-out hover:scale-105 active:scale-95",
      showGroupsCollapsed ? 'bg-slate-900 text-white hover:bg-slate-800 border-slate-900' : 'bg-white hover:bg-slate-50 border-slate-200'
    )}
  >
    {showGroupsCollapsed ? <Layers size={16} /> : <Grid size={16} />}
  </Button>
);
