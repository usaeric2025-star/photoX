import React from 'react';
import { useTogglePin } from '@/hooks';
import { Heart } from 'lucide-react';

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
      className={`absolute top-2 right-2 bg-black/50 p-1.5 rounded-full text-white z-20 hover:scale-110 active:scale-95 transition-transform disabled:opacity-50 ${isPinned ? 'text-red-500' : ''}`}
    >
      <Heart size={14} className={isPinned ? 'fill-current' : ''} />
    </button>
  );
}
