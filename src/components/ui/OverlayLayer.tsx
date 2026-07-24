import React from 'react';
import { cn } from '../../lib/utils.js';

interface OverlayLayerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'dark' | 'standard' | 'light' | 'none';
  isFixed?: boolean;
}

/**
 * OverlayLayer - 统一的背景遮罩层
 * 
 * 📌 [规范] 
 * 1. 严禁在任何地方手动编写 backdrop-blur。
 * 2. 性能敏感区（网格、灯箱）必须使用本组件或对应的实色背景。
 */
export const OverlayLayer = React.forwardRef<HTMLDivElement, OverlayLayerProps>(
  ({ variant = 'standard', isFixed = true, className, ...props }, ref) => {
    const variantClasses = {
      dark: 'bg-black/80',
      standard: 'bg-black/60',
      light: 'bg-white/95',
      none: 'bg-transparent'
    };

    return (
      <div
        ref={ref}
        className={cn(
          isFixed ? 'fixed inset-0 z-50' : 'absolute inset-0',
          variantClasses[variant],
          'pointer-events-none', // 默认不拦截事件，除非子元素需要
          className
        )}
        {...props}
      />
    );
  }
);

OverlayLayer.displayName = 'OverlayLayer';
