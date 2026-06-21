import React from 'react';
import { useTogglePin } from '@/hooks';
import { Icon } from '@/components/ui/Icon';

export function PinButton({ photoId, isPinned }: { photoId: string; isPinned: boolean }) {
  const togglePin = useTogglePin();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePin.mutate({ id: photoId, isPinned: !isPinned });
  };

  const isPending = togglePin.isPending;

  return (
    <button 
      onClick={handleClick}
      disabled={isPending}
      className={`absolute top-3 right-3 bg-slate-950/40 backdrop-blur-md border border-white/10 p-1.5 sm:p-2 rounded-full text-white hover:scale-110 md:hover:bg-slate-950/65 active:scale-95 transition-all duration-250 disabled:opacity-50 ${isPinned ? 'text-red-500 hover:text-red-400' : ''}`}
    >
      <Icon name="heart" size={14} className={isPinned ? 'fill-current stroke-none' : 'stroke-[2.5]'} />
    </button>
  );
}

