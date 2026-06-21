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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openPopover = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    dialogRef.current?.showModal();
    setIsOpen(true);
    onOpenChange?.(true);
  };

  const closePopover = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    dialogRef.current?.close();
    setIsOpen(false);
    onOpenChange?.(false);
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOpen) {
      closePopover(e);
    } else {
      openPopover(e);
    }
  };

  // Logic to position modal near trigger
  useEffect(() => {
    if (!isOpen || !dialogRef.current || !triggerRef.current) return;
    
    const rect = triggerRef.current.getBoundingClientRect();
    const top = rect.bottom + window.scrollY + 6;
    let left = rect.left + window.scrollX;
    
    if (align === 'center') left = rect.left + window.scrollX + rect.width / 2;
    else if (align === 'end') left = rect.right + window.scrollX;
    
    dialogRef.current.style.position = 'absolute';
    dialogRef.current.style.margin = '0';
    dialogRef.current.style.top = `${top}px`;
    dialogRef.current.style.left = `${left}px`;
    dialogRef.current.style.transform = align === 'center' ? 'translateX(-50%)' : align === 'end' ? 'translateX(-100%)' : 'none';
  }, [isOpen, align]);

  const portalRoot = document.getElementById('portal-root');
  if (!portalRoot) return null;

  return (
    <>
      <div ref={triggerRef} onClick={handleTriggerClick} className="inline-block cursor-pointer">
        {trigger}
      </div>
      {createPortal(
        <dialog
          ref={dialogRef}
          className="absolute m-0 bg-card rounded-xl shadow-xl p-2 border border-border backdrop:bg-transparent outline-none z-50 animate-in fade-in zoom-in-95 duration-100"
          style={{ right: 'auto', bottom: 'auto' }}
          onClose={() => setIsOpen(false)}
          onClick={(e) => {
            if (e.target === e.currentTarget) closePopover(e);
          }}
        >
          <div onClick={(e) => {
            e.stopPropagation();
            closePopover();
          }}>
            {children}
          </div>
        </dialog>,
        portalRoot
      )}
    </>
  );
}
