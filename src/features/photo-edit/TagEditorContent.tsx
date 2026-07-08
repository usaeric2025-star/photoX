import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import React, { useState, useDeferredValue } from "react";
import { cn } from "#lib/utils.js";
import {
  useTagSorting,
  useSettings,
  useTagSearch,
} from '#src/hooks/index.js';
import { MAX_TAGS_PER_PHOTO } from "#src/constants/limits.js";
import { Tag } from '#src/types/index.js';
import { SearchInput } from "#src/components/ui/SearchInput.js";
import { TagButton } from "./components/TagButton.js";
import { TagActionDialog } from "./components/TagActionDialog.js";

interface TagEditorProps {
  tags: Tag[]; // Initial tags or global list
  selectedTagIds: string[];
  onToggleTag: (tag: Tag) => void;
  onUpdateTag: (id: string, name: string) => void;
  onDeleteTag: (id: string) => void;
  onQuickAdd: () => void;
  onRenameTagRequest?: (tag: Tag) => void;
  showHotEffects?: boolean;
  hideHotLabel?: boolean;
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
  hideHotLabel = false,
}: TagEditorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const { settings, updateSettings } = useSettings();
  
  const [activeActionTag, setActiveActionTag] = useState<Tag | null>(null);

  // 0. Use server-side search for the keyword
  const { data: searchResults = [] } = useTagSearch(deferredSearchTerm);

  const togglePin = async (tagId: string) => {
    try {
      const pinnedTags = settings?.pinnedTags || [];
      const newPinned = pinnedTags.includes(tagId)
        ? pinnedTags.filter((id: string) => id !== tagId)
        : [...pinnedTags, tagId];

      const nextSettings = { ...settings, pinnedTags: newPinned };
      await updateSettings(nextSettings);
    } catch (err) {
      ErrorFactory.handle(err, { context: "切换置顶状态" });
    }
  };

  const { hotIds: hotTagsSet, pinnedIds } = useTagSorting(allTags, settings);

  const selectedSet = new Set(selectedTagIds.map(String));
  const pinnedSet = new Set(pinnedIds.map(String));

  // 1. Selected Tags Summary (for quick view)
  const selectedTags = React.useMemo(() => {
    return allTags.filter(t => selectedSet.has(String(t.id)));
  }, [allTags, selectedTagIds]);

  // 2. Data Source & Deduplication
  let displayList: Tag[] = [];
  const term = deferredSearchTerm.trim();
  if (!term) {
    displayList = allTags;
  } else {
    displayList = searchResults;
    const searchIds = new Set(searchResults.map(t => String(t.id)));
    const missingSelected = allTags.filter(t => selectedSet.has(String(t.id)) && !searchIds.has(String(t.id)));
    displayList = [...displayList, ...missingSelected];
  }

  // Deduplicate displayList by ID
  const uniqueDisplayList = Array.from(new Map(displayList.map(t => [String(t.id), t])).values());

  // 3. Sort Logic - Strictly stable (Pinned -> Alphabetical)
  // We NO LONGER sort by selected at the top in the main list to prevent jumping
  const filteredTags = React.useMemo(() => {
    return [...uniqueDisplayList].sort((a, b) => {
      const aPinned = pinnedSet.has(String(a.id));
      const bPinned = pinnedSet.has(String(b.id));
      if (aPinned !== bPinned) return aPinned ? -1 : 1;

      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
  }, [uniqueDisplayList, pinnedIds]);

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
            className="flex-1 text-xs"
          />
          <button
            type="button"
            onClick={onQuickAdd}
            className="h-8 text-[11px] font-bold text-blue-600 bg-blue-50/70 hover:bg-blue-100 hover:text-blue-700 px-3 rounded-lg border border-blue-100 active:bg-blue-200 transition-colors cursor-pointer shrink-0"
          >
            + 新增
          </button>
        </div>
      </div>

      {/* Selected Tags Summary Section */}
      {selectedTags.length > 0 && (
        <div className="px-1 py-2">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider">
              已选择 / SELECTED ({selectedTags.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-[6px] p-2 bg-blue-50/30 rounded-xl border border-blue-100/50 min-h-[40px]">
            {selectedTags.map(tag => (
              <button
                key={`selected-${tag.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTag(tag);
                }}
                className="group flex items-center gap-1.5 px-2 py-1 bg-white border border-blue-200 text-blue-600 rounded-lg text-[11px] font-medium hover:border-blue-300 hover:bg-blue-50 transition-all active:scale-95"
              >
                {tag.name}
                <span className="text-[10px] opacity-40 group-hover:opacity-100">✕</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-1 pt-1">
         <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
           全部标签 / ALL TAGS
         </span>
      </div>
      <div 
        className="pb-1 max-h-[220px] overflow-y-auto flex flex-wrap gap-[6px] content-start"
      >
        {filteredTags.slice(0, 150).map((tag: Tag) => {
          const isSelected = selectedSet.has(String(tag.id));
          const isHot = hotTagsSet.has(String(tag.id));
          const isPinned = pinnedIds.includes(String(tag.id));
          const isDisabled = !isSelected && selectedTagIds.length >= MAX_TAGS_PER_PHOTO;

          return (
            <TagButton
              key={tag.id}
              tag={tag}
              isSelected={isSelected}
              isHot={isHot}
              isPinned={isPinned}
              isDisabled={isDisabled}
              hideHotLabel={hideHotLabel}
              onToggle={onToggleTag}
              onLongPress={() => {
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

      <TagActionDialog
        activeTag={activeActionTag}
        pinnedIds={pinnedIds}
        onClose={() => setActiveActionTag(null)}
        onTogglePin={togglePin}
        onRenameRequest={(tag) => onRenameTagRequest?.(tag)}
        onDeleteTag={onDeleteTag}
      />
    </div>
  );
}




