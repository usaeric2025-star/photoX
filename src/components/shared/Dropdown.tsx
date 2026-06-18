import React, { useId } from 'react';
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { useClickOutside } from '@/hooks/core/useClickOutside';

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
}) => {
  const [isOpen, { toggle, close }] = useDisclosure(false);
  const anchorName = `--anchor-${useId().replace(/:/g, '')}`;

  const containerRef = useClickOutside<HTMLDivElement>(close);

  return (
    <div ref={containerRef} className="relative inline-block" style={{ anchorName } as any}>
      <button 
        type="button" 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(); }}
        className="outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded appearance-none border-none bg-transparent p-0 m-0 cursor-pointer flex items-center justify-center align-middle"
      >
        {trigger}
      </button>

      {isOpen && (
        <div 
          className={`absolute top-full mt-1 z-50 min-w-[180px] bg-white rounded-lg shadow-xl border border-gray-200 p-1 outline-none ${
            align === 'end' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0'
          }`}
          style={{ positionAnchor: anchorName } as any}
          onClick={(e) => e.stopPropagation()}
        >
          {children || items?.map((item, i) => (
            <button
              type="button"
              key={i}
              onClick={() => {
                item.onClick();
                close();
              }}
              className={`
                flex items-center gap-3 w-full text-left px-3 py-2 rounded-md text-sm cursor-pointer outline-none hover:bg-blue-50 transition-colors
                ${item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'}
              `}
            >
              {item.icon && <span className="opacity-70 flex items-center justify-center">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
