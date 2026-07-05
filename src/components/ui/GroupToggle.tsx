import { Icon } from '#src/components/ui/Icon.js';
import { cn } from '#lib/utils.js';

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
      "h-10 w-10 flex items-center justify-center rounded-lg transition-all active:scale-95 border shrink-0",
      showGroupsCollapsed 
        ? "bg-slate-900 text-white border-slate-900 shadow-sm" 
        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
    )}
  >
    {showGroupsCollapsed ? <Icon name="layers" size={20} /> : <Icon name="grid-3x3" size={20} />}
  </button>
);
