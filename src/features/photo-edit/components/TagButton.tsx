import React, { memo } from 'react';
import { cn } from "#lib/utils.js";
import { Icon } from '#src/components/ui/Icon.js';
import { Tag } from '#src/types/index.js';
import { useLongPress } from "#src/hooks/index.js";

interface TagButtonProps {
  tag: Tag;
  isSelected: boolean;
  isHot: boolean;
  isPinned: boolean;
  isDisabled: boolean;
  hideHotLabel: boolean;
  onToggle: (tag: Tag) => void;
  onLongPress: () => void;
}

/**
 * TagButton
 * 
 * 標籤選擇按鈕，支持單擊切換與長按編輯。
 */
export const TagButton = memo(function TagButton({ 
  tag, 
  isSelected, 
  isHot, 
  isPinned, 
  isDisabled, 
  hideHotLabel, 
  onToggle, 
  onLongPress 
}: TagButtonProps) {
  const handlers = useLongPress<HTMLButtonElement>({
    delay: 800,
    onLongPress: () => {
      onLongPress();
    },
    onClick: () => {
      onToggle(tag);
    },
    disabled: isDisabled
  });

  return (
    <div className="relative" id={`tag-${tag.id}`}>
      <button
        {...handlers}
        type="button"
        style={{
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
          touchAction: "pan-y",
          pointerEvents: "auto",
        }}
        className={cn(
          "px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all border select-none flex items-center gap-1 w-auto shadow-sm min-h-[32px] cursor-pointer outline-none",
          isSelected
            ? "bg-blue-600 text-white border-blue-600 font-semibold"
            : "bg-slate-50 text-slate-700 border-slate-100 hover:border-slate-300 hover:bg-slate-100/80 active:bg-slate-200/50",
          isHot &&
            !isSelected &&
            "border-amber-200 bg-amber-50/50 text-amber-800",
          isHot && isSelected && "ring-2 ring-amber-400",
          isDisabled && "opacity-30 grayscale saturate-50 cursor-not-allowed",
        )}
      >
        <span
          className={cn(
            "w-2 h-2 rounded-full shrink-0",
            isSelected
              ? "bg-white"
              : isHot
                ? "bg-amber-400"
                : "bg-slate-300",
          )}
        />
        <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">
          #{tag.name}
        </span>
        
        {isPinned && !isSelected && (
          <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full scale-90 origin-left font-black tracking-tighter shadow-sm flex items-center gap-0.5">
            <Icon name="heart" size={8} className="fill-white" /> 
            置顶
          </span>
        )}

        {!hideHotLabel && isHot && !isPinned && !isSelected && (
          <span className="text-[9px] bg-amber-400 text-white px-1.5 py-0.5 rounded-full scale-90 origin-left font-black tracking-tighter shadow-sm">
            HOT
          </span>
        )}
      </button>
    </div>
  );
});
