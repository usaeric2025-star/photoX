import { ErrorFactory } from '@/lib/error/ErrorFactory';
import React, { useState, useRef, useMemo, useDeferredValue } from "react";
import { createPortal } from "react-dom";
import { Pencil, Trash2, Heart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDisclosure } from "@mantine/hooks";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  usePhotoFilter,
  useSettings,
  useUIStore,
  useShallow,
  useTagSearch,
} from "@/hooks";
import { Tag } from "@/types";
import { SearchInput } from "@/components/ui/SearchInput";
import { useLongPress } from "@/hooks/core/useLongPress";

interface TagEditorProps {
  tags: Tag[]; // Initial tags or global list
  selectedTagIds: string[];
  onToggleTag: (tag: Tag) => void;
  onUpdateTag: (id: string, name: string) => void;
  onDeleteTag: (id: string) => void;
  onQuickAdd: () => void;
  onRenameTagRequest?: (tag: Tag) => void;
  showHotEffects?: boolean;
}

export function TagEditor({
  tags: allTags,
  selectedTagIds,
  onToggleTag,
  onUpdateTag,
  onDeleteTag,
  onQuickAdd,
  onRenameTagRequest,
  showHotEffects = false,
}: TagEditorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const { settings, updateSettings } = useSettings();
  
  const [activeActionTag, setActiveActionTag] = useState<Tag | null>(null);
  const portalOpenedAt = useRef<number>(0);
  const [isDeleteOpen, deleteDialog] = useDisclosure(false);

  // 0. Use server-side search for the keyword
  const { data: searchResults = [] } = useTagSearch(deferredSearchTerm);

  const togglePin = async (tagId: string) => {
    try {
      const pinnedTags = settings?.pinned_tags || [];
      const newPinned = pinnedTags.includes(tagId)
        ? pinnedTags.filter((id: string) => id !== tagId)
        : [...pinnedTags, tagId];

      const nextSettings = { ...settings, pinned_tags: newPinned };
      await updateSettings(nextSettings);
    } catch (err) {
      ErrorFactory.handle(err, "切换置顶状态");
    }
  };

  const { hotIds: hotTagsSet, pinnedIds } = usePhotoFilter(allTags, settings);

  const filteredTags = useMemo(() => {
    const selectedSet = new Set(selectedTagIds.map(String));
    const pinnedSet = new Set(pinnedIds.map(String));
    const hotSet = hotTagsSet;

    // 1. Data Source
    let displayList: Tag[] = [];
    
    if (!deferredSearchTerm.trim()) {
      // If no search, show hot/pinned and basic set from allTags (or just a subset)
      displayList = allTags;
    } else {
      // Start with search results
      displayList = searchResults;

      // Add selected tags if they are missing from search results
      const searchIds = new Set(searchResults.map(t => String(t.id)));
      const missingSelected = allTags.filter(t => selectedSet.has(String(t.id)) && !searchIds.has(String(t.id)));
      displayList = [...displayList, ...missingSelected];
    }

    // 2. Sort Logic
    return [...displayList].sort((a, b) => {
      const aId = String(a.id);
      const bId = String(b.id);
      
      const aSelected = selectedSet.has(aId);
      const bSelected = selectedSet.has(bId);
      if (aSelected !== bSelected) return aSelected ? -1 : 1;

      const aPinned = pinnedSet.has(aId);
      const bPinned = pinnedSet.has(bId);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;

      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
  }, [allTags, searchResults, deferredSearchTerm, pinnedIds, hotTagsSet, selectedTagIds]);

  return (
    <div className="space-y-2">
      <div className="space-y-2 mb-3">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none px-1">
          标签 / TAGS
        </h3>
        <div className="flex items-center gap-2 px-1 relative group">
          <SearchInput
            placeholder="搜索标签..."
            onSearch={setSearchTerm}
            delay={0}
            className="flex-1"
          />
          <button
            type="button"
            onClick={onQuickAdd}
            className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-1.5 rounded-lg border border-blue-100 active:bg-blue-100 transition-colors"
          >
            + 新增
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pb-1 max-h-48 overflow-y-auto content-start">
        {filteredTags.slice(0, 150).map((tag: Tag) => {
          const isSelected = selectedTagIds.map(String).includes(String(tag.id));
          const isHot = hotTagsSet.has(String(tag.id));
          const isPinned = pinnedIds.includes(String(tag.id));
          const isDisabled = !isSelected && selectedTagIds.length >= 3;

          return (
            <TagButton
              key={tag.id}
              tag={tag}
              isSelected={isSelected}
              isHot={isHot}
              isPinned={isPinned}
              isDisabled={isDisabled}
              onToggle={onToggleTag}
              onLongPress={() => {
                portalOpenedAt.current = Date.now();
                setActiveActionTag(tag);
              }}
            />
          );
        })}
        {filteredTags.length > 150 && (
            <div className="w-full text-center py-2 text-[10px] text-slate-400">
                更多标签请使用搜索... / Search to find more tags
            </div>
        )}
      </div>

      {activeActionTag && createPortal(
        <div
          className="fixed inset-0 z-[var(--z-index-max)] bg-slate-950/40 flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-200"
          onPointerDown={(e) => {
            // Prevent closure on the same click/touch that opened it
            if (Date.now() - portalOpenedAt.current < 400) return;
            if (e.target === e.currentTarget) setActiveActionTag(null);
          }}
        >
          <div
            className="glass-morphism rounded-3xl p-8 w-full max-w-[280px] shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200 bg-white border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                标签管理 / TAG
              </span>
              <div className="text-lg font-black text-slate-900">
                #{activeActionTag.name}
              </div>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 text-amber-600 bg-amber-50/50 backdrop-blur-sm border border-amber-100/50 font-bold py-4 rounded-2xl hover:bg-amber-100 transition-all cursor-pointer shadow-sm shadow-amber-500/5"
                onClick={() => {
                  togglePin(String(activeActionTag.id));
                  setActiveActionTag(null);
                }}
              >
                <Heart
                  size={18}
                  strokeWidth={2.5}
                  className={
                    pinnedIds.includes(String(activeActionTag.id))
                      ? "fill-amber-600"
                      : ""
                  }
                />
                {pinnedIds.includes(String(activeActionTag.id))
                  ? "取消置顶 / Unpin"
                  : "设为置顶 / Pin as Hot"}
              </button>
              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 text-blue-600 bg-blue-50/50 backdrop-blur-sm border border-blue-100/50 font-bold py-4 rounded-2xl hover:bg-blue-100 transition-all cursor-pointer shadow-sm shadow-blue-500/5"
                onClick={() => {
                  if (onRenameTagRequest) {
                    onRenameTagRequest(activeActionTag);
                  }
                  setActiveActionTag(null);
                }}
              >
                <Pencil size={18} strokeWidth={2.5} /> 编辑名称 / Rename
              </button>
              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 text-red-600 bg-red-50/50 backdrop-blur-sm border border-red-100/50 font-bold py-4 rounded-2xl hover:bg-red-100 transition-all cursor-pointer shadow-sm shadow-red-500/5"
                onClick={() => {
                  deleteDialog.open();
                  setActiveActionTag(null);
                }}
              >
                <Trash2 size={18} strokeWidth={2.5} /> 彻底删除 / Delete
              </button>
            </div>
            <button
              type="button"
              className="w-full text-slate-400 text-[10px] font-black uppercase tracking-tighter pt-2 active:text-slate-600 cursor-pointer"
              onClick={() => setActiveActionTag(null)}
            >
              取消操作 / CANCEL
            </button>
          </div>
        </div>,
        document.body
      )}

      {activeActionTag && (
        <ConfirmDialog
          open={isDeleteOpen}
          onOpenChange={deleteDialog.toggle}
          title={`彻底删除标签 / Permanent Delete: #${activeActionTag.name}`}
          description="无法撤销且会从所有照片中移除 / This will be permanently removed from all photos."
          confirmText="删除"
          variant="destructive"
          onConfirm={() => {
            try {
              onDeleteTag(activeActionTag.id);
            } catch (e) {
              throw ErrorFactory.wrap(e, "彻底删除标签", activeActionTag.name);
            }
          }}
        />
      )}
    </div>
  );
}

const TagButton = React.memo(({ tag, isSelected, isHot, isPinned, isDisabled, onToggle, onLongPress: onLongPressProp }: any) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  useLongPress(btnRef, {
    delay: 400,
    onLongPress: onLongPressProp
  });

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        style={{
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
          touchAction: "pan-y",
          pointerEvents: "auto",
        }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (isDisabled) return;
          onToggle(tag);
        }}
        className={cn(
          "px-3 py-2 rounded-lg text-[11px] font-bold transition-all border select-none flex items-center gap-1.5 w-auto shadow-sm min-h-[44px] active:scale-95",
          isSelected
            ? "bg-blue-600 text-white border-blue-600 z-10"
            : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 active:bg-slate-50",
          isHot &&
            !isSelected &&
            "border-amber-300 bg-amber-50 text-amber-800",
          isHot && isSelected && "ring-2 ring-amber-400",
          isDisabled && "opacity-30 grayscale saturate-50",
        )}
      >
        <span
          className={cn(
            "w-2 h-2 rounded-full",
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
          <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full scale-90 origin-left font-black tracking-tighter shadow-sm">
            <Heart size={8} className="fill-white" /> 置顶
          </span>
        )}
        {isHot && !isPinned && !isSelected && (
          <span className="text-[9px] bg-amber-400 text-white px-1.5 py-0.5 rounded-full scale-90 origin-left font-black tracking-tighter">
            HOT
          </span>
        )}
      </button>
    </div>
  );
});

TagButton.displayName = "TagButton";

