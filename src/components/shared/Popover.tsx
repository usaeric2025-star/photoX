import { Popover as BasePopover } from '@base-ui/react/popover';

export const Popover = ({ 
  trigger, 
  children 
}: { 
  trigger: React.ReactNode;
  children: React.ReactNode;
}) => (
  <BasePopover.Root>
    <BasePopover.Trigger className="outline-none">{trigger}</BasePopover.Trigger>
    <BasePopover.Portal>
      <BasePopover.Positioner sideOffset={8}>
        <BasePopover.Popup className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 outline-none">
          {children}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  </BasePopover.Root>
);
