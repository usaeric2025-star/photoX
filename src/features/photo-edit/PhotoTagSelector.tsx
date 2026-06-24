import React, { useState } from "react";
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { PromptDialog } from "@/components/ui/PromptDialog";
import { TagEditor } from "./TagEditorContent";
import { MAX_TAGS_PER_PHOTO } from "@/constants/limits";
import { Tag } from "@/types";
import { safeArray } from "@/lib/utils";

interface PhotoTagSelectorProps {
  selectedTagIds: string[];
  onChange: (ids: string[]) => void;
  addTag: (name: string) => Promise<string | null>;
  updateTag: (id: string, name: string) => Promise<unknown>;
  deleteTag: (id: string) => Promise<unknown>;
  tags: Tag[];
  hideHotLabel?: boolean;
}

export function PhotoTagSelector({
  selectedTagIds,
  onChange,
  addTag,
  updateTag,
  deleteTag,
  tags,
  hideHotLabel,
}: PhotoTagSelectorProps) {
  const [isAddOpen, addDialog] = useDisclosure(false);
  const [isEditOpen, editDialog] = useDisclosure(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const cleanSelectedIds = Array.from(
    new Set(
      safeArray(selectedTagIds)
        .map((item) => String(typeof item === 'object' ? (item as any).id || '' : item).trim())
        .filter(Boolean),
    ),
  );

  const sortedTags = [...tags].sort((a, b) => {
    const isASelected = cleanSelectedIds.includes(String(a.id));
    const isBSelected = cleanSelectedIds.includes(String(b.id));

    if (isASelected && !isBSelected) return -1;
    if (!isASelected && isBSelected) return 1;

    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });

  const handleToggleTag = (tag: Tag) => {
    const strId = String(tag.id);
    if (cleanSelectedIds.includes(strId)) {
      onChange(cleanSelectedIds.filter((id) => id !== strId));
    } else {
      if (cleanSelectedIds.length >= MAX_TAGS_PER_PHOTO) return;
      onChange([...cleanSelectedIds, strId]);
    }
  };

  return (
    <>
      <TagEditor
        tags={sortedTags}
        selectedTagIds={cleanSelectedIds}
        onToggleTag={handleToggleTag}
        onUpdateTag={updateTag}
        onDeleteTag={deleteTag}
        onQuickAdd={addDialog.open}
        onRenameTagRequest={(tag) => {
          setEditingTag(tag);
          editDialog.open();
        }}
        showHotEffects={false}
        hideHotLabel={hideHotLabel}
      />
      <PromptDialog
        open={isAddOpen}
        onOpenChange={addDialog.toggle}
        title="新增標籤 / Add Tag"
        description="輸入標籤名稱 / Enter Tag Name"
        onConfirm={async (name: string) => {
          if (!name.trim()) return false;
          const saved = await addTag(name.trim());
          if (saved) {
             const existing = tags.find(t => t.name.toUpperCase() === name.trim().toUpperCase());
             onChange([...new Set([...cleanSelectedIds, String(existing?.id || saved)])]);
          }
          return true;
        }}
      />
      {editingTag && (
        <PromptDialog
          open={isEditOpen}
          onOpenChange={editDialog.toggle}
          title="編輯標籤 / Edit Tag"
          description="輸入標籤名稱 / Enter Tag Name:"
          defaultValue={editingTag.name}
          onConfirm={async (n: string) => {
            if (n && n.trim()) {
              await updateTag(String(editingTag.id), n.trim());
              return true;
            }
            return false;
          }}
        />
      )}
    </>
  );
}
