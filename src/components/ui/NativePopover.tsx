import React, { useState, useEffect, useRef } from 'react';

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
  const [isExiting, setIsExiting] = useState(false);

  const openPopover = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsOpen(true);
    setIsExiting(false);
    onOpenChange?.(true);
    
    // Position after open state is true
    requestAnimationFrame(() => {
      dialogRef.current?.showModal();
    });
  };

  const closePopover = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (isExiting) return;
    
    setIsExiting(true);
    onOpenChange?.(false);

    // Wait for animation out (duration-150)
    setTimeout(() => {
      dialogRef.current?.close();
      setIsOpen(false);
      setIsExiting(false);
    }, 150);
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

  return (
    <>
      <div ref={triggerRef} onClick={handleTriggerClick} className="inline-block cursor-pointer">
        {trigger}
      </div>
      {isOpen && (
        <dialog
          ref={dialogRef}
          className={`
            absolute m-0 bg-card rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-2 border border-border/60 
            backdrop:bg-transparent outline-none
            ${isExiting 
              ? 'animate-out fade-out zoom-out-95 duration-150 ease-in fill-mode-forwards' 
              : 'animate-in fade-in zoom-in-95 duration-200 ease-out'}
          `}
          style={{ right: 'auto', bottom: 'auto' }}
          onClose={() => setIsOpen(false)}
          onClick={(e) => {
            if (e.target === e.currentTarget) closePopover(e);
          }}
        >
          <div onClick={(e) => {
            e.stopPropagation();
            // Delay closing slightly so user sees click effect
            setTimeout(closePopover, 80);
          }}>
            {children}
          </div>
        </dialog>
      )}
    </>
  );
}
