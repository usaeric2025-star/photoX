import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoSelectionIndicatorProps {
  isSelected: boolean;
}

export function PhotoSelectionIndicator({ isSelected }: PhotoSelectionIndicatorProps) {
  return (
    <div className="absolute inset-0 w-full h-full transition-all duration-300 flex items-center justify-center p-3 sm:p-4 pointer-events-none bg-blue-500/10">
      <div className={cn(
        "w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 transition-all flex items-center justify-center pointer-events-none shadow-sm",
        isSelected 
          ? "bg-blue-600 border-white shadow-xl scale-110 opacity-100" 
          : "bg-white/40 border-white/60 opacity-60 md:group-hover:opacity-100"
      )}>
        {isSelected && (
          <Check size={16} className="text-white" />
        )}
      </div>
    </div>
  );
}
