import { Icon } from '@/components/ui/Icon';
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
      "h-10 w-10 flex items-center justify-center rounded-full transition-all active:scale-95 border shrink-0",
      showGroupsCollapsed 
        ? "bg-primary text-text-on-primary border-primary shadow-md" 
        : "bg-surface-soft text-text-main border-border-bold hover:bg-surface-mute"
    )}
  >
    {showGroupsCollapsed ? <Icon name="layers" size={20} /> : <Icon name="grid-3x3" size={20} />}
  </button>
);
