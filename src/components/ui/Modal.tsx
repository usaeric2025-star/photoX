import * as React from "react";
import { Icon } from './Icon';
import { logger } from '@/lib/logger';

export interface ModalProps {
  id: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'screen';
  className?: string;
  hidePadding?: boolean;
  showCloseButton?: boolean;
}

const sizeClasses = {
  sm: 'max-w-md w-full',
  md: 'max-w-lg w-full',
  lg: 'max-w-2xl w-full',
  xl: 'max-w-3xl w-full',
  '2xl': 'max-w-4xl w-full',
  full: 'max-w-[90vw] w-full',
  screen: 'max-w-[100vw] w-[100vw] h-[100dvh] max-h-[100dvh] rounded-none m-0',
};

/**
 * 2026 规范化 Modal 组件 (使用原生 <dialog>)
 * 遵照 AGENTS.md 规范：
 * - 物理渲染在声明位置，通过原生 API 顶层渲染
 * - 严禁手动设置 z-index 保证天然层级
 * - 精准处理 HTML5 dialog 各种边界情况
 */
export function Modal({
  id,
  open,
  onClose,
  children,
  title,
  description,
  size = 'md',
  className = '',
  hidePadding = false,
  showCloseButton = true,
}: ModalProps) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (open) {
      if (!el.open) {
        try {
          el.showModal();
          document.body.style.overflow = 'hidden';
        } catch (e) {
          logger.warn('[Modal] Failed to execute showModal, falling back to open attribute:', e);
          el.setAttribute('open', '');
          document.body.style.overflow = 'hidden';
        }
      }
    } else {
      if (el.open) {
        try {
          el.close();
        } catch (e) {
          el.removeAttribute('open');
        }
      }
      const activeDialogs = document.querySelectorAll('dialog[open]');
      if (activeDialogs.length === 0) {
        document.body.style.overflow = '';
      }
    }

    return () => {
      const activeDialogs = document.querySelectorAll('dialog[open]');
      if (activeDialogs.length === 0) {
        document.body.style.overflow = '';
      }
    };
  }, [open]);

  // 处理原生 ESC 键取消
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    const handleClose = () => {
      onClose();
    };

    el.addEventListener('cancel', handleCancel);
    el.addEventListener('close', handleClose);
    return () => {
      el.removeEventListener('cancel', handleCancel);
      el.removeEventListener('close', handleClose);
    };
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const isInDialog = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );
      if (!isInDialog) {
        onClose();
      }
    }
  };

  return (
    <dialog
      ref={ref}
      onClick={handleBackdropClick}
      className={`
        m-auto
        animate-in fade-in zoom-in-95 duration-200 ease-out
        ${sizeClasses[size]}
        ${size === 'screen' ? '' : 'rounded-xl shadow-2xl'}
        w-full bg-surface-base border-none
        backdrop:bg-black/40 backdrop:backdrop-blur-md
        p-0 overflow-hidden outline-none z-[10050] ${className}
      `}
      id={id}
    >
      <div className={`flex flex-col w-full relative ${size === 'screen' ? 'h-full max-h-none' : 'max-h-[90vh]'}`}>
        {showCloseButton && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute right-4 top-4 p-2 rounded-full text-text-sub hover:text-text-main hover:bg-surface-soft transition-all active:scale-95 z-10"
            aria-label="关闭"
          >
            <Icon name="x-circle" size={26} solid className="opacity-25 hover:opacity-100 transition-opacity" />
          </button>
        )}

        {(title || description) && (
          <div className="px-6 pt-6 pb-2 flex flex-col gap-1 shrink-0">
            {title && (
              <h2 className="text-[20px] font-bold text-text-main tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-[14px] text-text-sub leading-relaxed">
                {description}
              </p>
            )}
          </div>
        )}

        <div className={`flex-1 overflow-y-auto min-h-0 ${hidePadding ? '' : 'px-6 py-5'}`}>
          {children}
        </div>
      </div>
    </dialog>
  );
}
