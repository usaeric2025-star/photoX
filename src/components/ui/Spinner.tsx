import React from 'react';
import { Loader2 } from '@react-zero-ui/icon-sprite';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function Spinner({ className, size = 'md' }: SpinnerProps) {
  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <Loader2 
        className={cn('animate-spin text-blue-600/20', sizeClasses[size])} 
        strokeWidth={1.5}
      />
      <Loader2 
        className={cn('animate-spin text-blue-600 absolute transition-all', sizeClasses[size])} 
        strokeWidth={2.5}
        style={{ animationDuration: '0.8s', clipPath: 'inset(0 0 50% 0)' }}
      />
    </div>
  );
};
