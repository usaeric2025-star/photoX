import React, { useEffect, useRef } from 'react';
import { cn } from '#src/lib/utils.js';

interface TopLayerProps {
  children: React.ReactNode;
  className?: string;
  type?: 'popover' | 'dialog';
  open?: boolean;
  onClose?: () => void;
  id?: string;
}

/**
 * TopLayer
 * 
 * 利用原生 Top Layer (popover 或 dialog) 管理懸浮元素，徹底消除 z-index 戰爭。
 * - popover: 用於工具欄、FAB、菜單（非模態）。
 * - dialog: 用於彈窗、全屏遮罩（模態）。
 */
export function TopLayer({ 
  children, 
  className, 
  type = 'popover', 
  open = true,
  onClose,
  id
}: TopLayerProps) {
  const ref = useRef<any>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (open) {
      if (type === 'popover') {
        if (!el.matches(':popover-open')) {
          try { el.showPopover(); } catch (e) { console.error('Failed to show popover', e); }
        }
      } else {
        if (!el.open) {
          try { el.showModal(); } catch (e) { console.error('Failed to show modal', e); }
        }
      }
    } else {
      if (type === 'popover') {
        if (el.matches(':popover-open')) {
          try { el.hidePopover(); } catch (e) {}
        }
      } else {
        if (el.open) {
          try { el.close(); } catch (e) {}
        }
      }
    }
  }, [open, type]);

  // Handle auto-close for popovers
  useEffect(() => {
    const el = ref.current;
    if (!el || type !== 'popover') return;

    const handleToggle = (e: any) => {
      if (e.newState === 'closed' && open) {
        onClose?.();
      }
    };

    el.addEventListener('toggle', handleToggle);
    return () => el.removeEventListener('toggle', handleToggle);
  }, [type, open, onClose]);

  if (type === 'dialog') {
    return (
      <dialog 
        id={id}
        ref={ref} 
        onClose={onClose}
        className={cn(
          "fixed m-0 p-0 overflow-visible outline-none bg-transparent border-none backdrop:bg-black/40",
          className
        )}
      >
        {children}
      </dialog>
    );
  }

  return (
    <div 
      id={id}
      ref={ref} 
      popover="manual" 
      className={cn(
        "fixed bg-transparent border-none p-0 m-0 overflow-visible outline-none", 
        className
      )}
    >
      {children}
    </div>
  );
}
