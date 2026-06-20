import { Layers, Grid } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface GroupToggleProps {
  showGroupsCollapsed: boolean;
  onClick: () => void;
}

export const GroupToggle = ({ showGroupsCollapsed, onClick }: GroupToggleProps) => (
  <button 
    id="group-toggle-btn"
    onClick={onClick}
    title={showGroupsCollapsed ? 'Switch to separated view' : 'Switch to grouped view'}
    className={cn(
      "p-2 border rounded-lg transition-colors flex items-center justify-center",
      showGroupsCollapsed ? 'bg-slate-900 text-white hover:bg-slate-800 border-slate-900' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
    )}
  >
    {showGroupsCollapsed ? <Layers size={18} /> : <Grid size={18} />}
  </button>
);
