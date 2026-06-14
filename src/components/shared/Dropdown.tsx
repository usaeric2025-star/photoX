import { useState, useRef, useEffect, ReactNode, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { useDisclosure } from '../../hooks/core/useDisclosure';

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  align?: 'left' | 'right';
  triggerClassName?: string;
}

/**
 * Modern Dropdown component using CSS Anchor Positioning with accessibility.
 * No z-index used for modern browser paths.
 */
export function Dropdown({ 
  trigger, 
  children, 
  className, 
  align = 'left',
  triggerClassName 
}: DropdownProps) {
  const [isOpen, { toggle, close }] = useDisclosure(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle outside clicks
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(event.target as Node) &&
        menuRef.current && !menuRef.current.contains(event.target as Node)
      ) {
        close();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, close]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, close]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        className={cn("anchor-trigger cursor-pointer select-none", triggerClassName)}
      >
        {trigger}
      </div>

      {isOpen && (
        <div
          ref={menuRef}
          className={cn(
            "anchor-content mt-2 min-w-[200px] bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden animate-scale-in z-[100]",
            align === 'right' && "left-auto right-0",
            className
          )}
        >
          <div className="p-1 focus:outline-none" role="menu">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  icon?: ReactNode;
  danger?: boolean;
}

export function DropdownItem({ 
  children, 
  onClick, 
  className, 
  icon,
  danger 
}: DropdownItemProps) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors rounded-lg text-left",
        danger 
          ? "text-red-600 hover:bg-red-50" 
          : "text-slate-700 hover:bg-slate-50 active:bg-slate-100",
        className
      )}
    >
      {icon && <span className="shrink-0 opacity-70">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="h-px bg-slate-100 my-1 mx-1" />;
}
