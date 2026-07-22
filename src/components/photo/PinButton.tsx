import React from 'react';
import { usePhotoMutations } from '#src/hooks/index.js';
import { Icon } from '#src/components/ui/Icon.js';

export function PinButton({ photoId, isPinned }: { photoId: string; isPinned: boolean }) {
  const { togglePin, togglePinMutation } = usePhotoMutations();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isPending) return;
    togglePin({ id: photoId, isPinned: !isPinned });
  };

  const isPending = togglePinMutation.isPending;

  return (
    <button 
      type="button"
      onClick={handleClick}
      disabled={isPending}
      title={isPinned ? "取消置頂" : "置頂相片"}
      className={`absolute top-2 right-2 p-1.5 sm:p-2 rounded-full border hover:scale-110 active:scale-95 transition-all duration-250 ${
        isPinned 
          ? 'bg-white text-slate-950 border-white shadow-md' 
          : 'bg-slate-950/40 text-white border-white/10 md:hover:bg-slate-950/65'
      } ${isPending ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <Icon name="heart" size={14} className={isPinned ? 'fill-current' : 'stroke-[2.5]'} />
    </button>
  );
}

