import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

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
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const calculatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    
    // Export trigger width to CSS for consumer use (like dropdowns that match width)
    triggerRef.current.style.setProperty('--trigger-width', `${rect.width}px`);

    // We position the popover using fixed styling so it is completely immune to
    // scroll parents and overflow clipping (especially inside custom layout/list layers)
    const top = rect.bottom;
    let left = rect.left;

    if (align === 'center') {
      left = rect.left + rect.width / 2;
    } else if (align === 'end') {
      left = rect.right;
    }

    // Viewport collision and boundary checks for top-tier robustness
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 768;
    const margin = 12; // Safety margin offset from the screen edge
    
    const estWidth = popoverRef.current ? popoverRef.current.offsetWidth : 220;
    const estHeight = popoverRef.current ? popoverRef.current.offsetHeight : 160;

    // Check left/right alignment coordinate clipping
    let projLeft = left;
    if (align === 'center') {
      projLeft = left - estWidth / 2;
    } else if (align === 'end') {
      projLeft = left - estWidth;
    }
    const projRight = projLeft + estWidth;

    if (projRight > viewportWidth - margin) {
      left = left - (projRight - (viewportWidth - margin));
    }
    if (projLeft < margin) {
      left = left + (margin - projLeft);
    }

    // Auto-flip upward if there isn't enough vertical space at the bottom
    let actualTop = top + 6; // 6px offset for breathing space below trigger
    if (top + estHeight > viewportHeight - margin && rect.top > estHeight + margin) {
      actualTop = rect.top - estHeight - 6;
    }

    setCoords({ top: actualTop, left });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    if (!isOpen) return;

    // Run first measurement immediately, and schedule another in RAF to guarantee complete layouts are measured
    calculatePosition();
    const rafId = requestAnimationFrame(() => {
      calculatePosition();
    });

    // Recalculate position on page scroll or sizing changes
    // Using capture: true to monitor any inner overflow division scroll (like lists)
    const handleUpdate = () => {
      calculatePosition();
    };

    window.addEventListener('scroll', handleUpdate, { passive: true, capture: true });
    window.addEventListener('resize', handleUpdate, { passive: true });

    // Handle clicks outside either the trigger or popover content
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        popoverRef.current && !popoverRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    // Close on Escape key press
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleOutsideClick, { capture: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleUpdate, { capture: true });
      window.removeEventListener('resize', handleUpdate);
      document.removeEventListener('click', handleOutsideClick, { capture: true });
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, align]);

  // Apply state-based positioning variables (using calculated coords)
  const popoverStyle: React.CSSProperties = coords ? {
    position: 'fixed',
    top: `${coords.top}px`,
    left: `${coords.left}px`,
    transform: align === 'center' ? 'translateX(-50%)' : align === 'end' ? 'translateX(-100%)' : 'none',
  } : {
    position: 'fixed',
    visibility: 'hidden',
  };

  const portalRoot = document.getElementById('portal-root');

  return (
    <div ref={triggerRef} className="inline-block relative">
      <div onClick={handleToggle} className="cursor-pointer flex items-center justify-center">
        {trigger}
      </div>
      {isOpen && portalRoot && createPortal(
        <div
          ref={popoverRef}
          style={popoverStyle}
          className={`
            z-[9999] min-w-[200px] bg-slate-50 border border-slate-200/80 rounded-xl p-1 shadow-xl
            dark:bg-slate-900 dark:border-slate-800
            animate-in fade-in slide-in-from-top-1 duration-150 ease-out outline-none
            ${className}
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Automatically inject a close handler for actions inside */}
          <div onClick={handleClose}>
            {children}
          </div>
        </div>,
        portalRoot
      )}
    </div>
  );
}
