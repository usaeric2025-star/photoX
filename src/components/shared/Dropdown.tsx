import { Menu } from '@base-ui/react/menu';

export const Dropdown = Menu.Root;
export const DropdownTrigger = Menu.Trigger;
export const DropdownPortal = Menu.Portal;
export const DropdownPositioner = Menu.Positioner;
export const DropdownPopup = Menu.Popup;
export const DropdownItem = Menu.Item;
export const DropdownSeparator = Menu.Separator;

interface MenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  icon?: React.ReactNode;
}

export const DropdownMenu = ({ 
  trigger, 
  children,
  items,
  align = 'start'
}: { 
  trigger: React.ReactNode;
  children?: React.ReactNode;
  items?: MenuItem[];
  align?: 'start' | 'center' | 'end';
}) => (
  <Dropdown>
    <DropdownTrigger className="outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded">
      {trigger}
    </DropdownTrigger>

    <DropdownPortal>
      <DropdownPositioner sideOffset={8} align={align}>
        <DropdownPopup className="min-w-[180px] bg-white rounded-lg shadow-xl border border-gray-200 p-1 outline-none z-50">
          {children || items?.map((item, i) => (
            <DropdownItem
              key={i}
              onClick={item.onClick}
              className={`
                flex items-center gap-3 w-full text-left px-3 py-2 rounded-md text-sm cursor-default outline-none
                data-[highlighted]:bg-blue-50
                ${item.danger ? 'text-red-600 data-[highlighted]:bg-red-50' : 'text-gray-700'}
              `}
            >
              {item.icon && <span className="opacity-70">{item.icon}</span>}
              {item.label}
            </DropdownItem>
          ))}
        </DropdownPopup>
      </DropdownPositioner>
    </DropdownPortal>
  </Dropdown>
);
