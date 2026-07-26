import React, { useState, useEffect, useRef } from 'react';
import { cn } from '#src/lib/utils.js';

interface NativePopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
  onOpenChange?: (open: boolean) => void;
}

export function NativePopover({ 
  trigger, 
  children, 
  align = 'start', 
  className = '', 
  onOpenChange 
}: NativePopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Use the modern 'popover' API
  const togglePopover = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!popoverRef.current) return;

    try {
      if (isOpen) {
        popoverRef.current.hidePopover();
      } else {
        popoverRef.current.showPopover();
      }
    } catch (err) {
      // Fallback if browser doesn't support popover API fully
      setIsOpen(!isOpen);
    }
  };

  useEffect(() => {
    const popover = popoverRef.current;
    if (!popover) return;

    const handleToggle = (e: Event) => {
      const target = e as unknown as { newState: string };
      const newState = target.newState === 'open';
      setIsOpen(newState);
      onOpenChange?.(newState);
      
      if (newState && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const top = rect.bottom + window.scrollY + 6;
        let left = rect.left + window.scrollX;
        
        if (align === 'center') left = rect.left + window.scrollX + rect.width / 2;
        else if (align === 'end') left = rect.right + window.scrollX;
        
        popover.style.position = 'absolute';
        popover.style.margin = '0';
        popover.style.top = `${top}px`;
        popover.style.left = `${left}px`;
        popover.style.transform = align === 'center' ? 'translateX(-50%)' : align === 'end' ? 'translateX(-100%)' : 'none';
      }
    };

    popover.addEventListener('toggle', handleToggle);
    return () => popover.removeEventListener('toggle', handleToggle);
  }, [align, onOpenChange]);

  return (
    <>
      <div 
        ref={triggerRef} 
        onClick={togglePopover} 
        className="inline-block cursor-pointer"
      >
        {trigger}
      </div>
      
      <div
        ref={popoverRef}
        popover="auto"
        className={cn(
          "bg-white rounded-2xl shadow-xl p-2 border border-slate-100 outline-none m-0",
          "animate-in fade-in zoom-in-95 duration-150 ease-out",
          className
        )}
        style={{ inset: 'auto' }}
      >
        <div onClick={() => {
          try {
            popoverRef.current?.hidePopover();
          } catch (e) {
            // ignore
          }
        }}>
          {children}
        </div>
      </div>
    </>
  );
}
