import React, { useState } from "react";
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { Control, useController, useFormContext } from "react-hook-form";
import { PromptDialog } from "@/components/ui/PromptDialog";
import { TagEditor } from "../TagEditor";
import { Tag } from "../../../types";
import { safeArray } from "../../../lib/utils";
import { ErrorFactory } from '@/lib/error/ErrorFactory';

interface PhotoTagSelectorProps {
  name: string;
  addTag: (name: string) => Promise<any>;
  updateTag: (id: string, name: string) => Promise<any>;
  deleteTag: (id: string) => Promise<any>;
  tags: Tag[];
  control?: any;
}

export function PhotoTagSelector({
  name,
  addTag,
  updateTag,
  deleteTag,
  tags,
  control: propControl,
}: PhotoTagSelectorProps) {
  const context = useFormContext();
  const control = propControl || context?.control;

  const { field } = useController({
    name,
    control,
    defaultValue: []
  });

  const selectedTagIds = field.value || [];
  
  const [isAddOpen, addDialog] = useDisclosure(false);
  const [isEditOpen, editDialog] = useDisclosure(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const cleanSelectedIds = Array.from(
      new Set(
        safeArray(selectedTagIds)
          .map((id) => String(id).trim())
          .filter(Boolean),
      ),
    );

  const sortedTags = React.useMemo(() => {
    return [...tags].sort((a, b) => {
      const isASelected = cleanSelectedIds.includes(String(a.id));
      const isBSelected = cleanSelectedIds.includes(String(b.id));

      if (isASelected && !isBSelected) return -1;
      if (!isASelected && isBSelected) return 1;

      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
  }, [tags, cleanSelectedIds]);

  const handleToggleTag = React.useCallback((tag: Tag) => {
    const strId = String(tag.id);
    if (cleanSelectedIds.includes(strId)) {
      field.onChange(cleanSelectedIds.filter((id) => id !== strId));
    } else {
      if (cleanSelectedIds.length >= 10) {
        import('sonner').then(({ toast }) => {
          toast.warning("最多只能选择 10 个标签 / Maximum of 10 tags allowed");
        });
        return;
      }
      field.onChange([...cleanSelectedIds, strId]);
    }
  }, [cleanSelectedIds, field]);

  const onQuickAdd = React.useCallback(() => addDialog.open(), [addDialog]);
  const onRenameTagRequest = React.useCallback((tag: Tag) => {
    setEditingTag(tag);
    editDialog.open();
  }, [editDialog]);

  return (
    <>
      <TagEditor
        tags={sortedTags}
        selectedTagIds={cleanSelectedIds}
        onToggleTag={handleToggleTag}
        onUpdateTag={updateTag}
        onDeleteTag={deleteTag}
        onQuickAdd={onQuickAdd}
        onRenameTagRequest={onRenameTagRequest}
        showHotEffects={false}
      />
      <PromptDialog
        open={isAddOpen}
        onOpenChange={addDialog.toggle}
        title="新增标签 / Add Tag"
        description="输入标签名称 / Enter Tag Name"
        onConfirm={async (name: string) => {
          const trimmed = name.trim();
          if (!trimmed) return;

          const existing = tags.find(
            (t) => t.name.toUpperCase() === trimmed.toUpperCase(),
          );
          if (existing) {
              field.onChange([
                ...new Set([...cleanSelectedIds, String(existing.id)]),
              ]);
            return;
          }

          try {
            const saved = await addTag(trimmed);
            if (saved) {
              field.onChange([...new Set([...cleanSelectedIds, String(saved)])]);
            }
          } catch (err: unknown) {
            ErrorFactory.handle(err, "新增标签失败");
          }
        }}
      />
      {editingTag && (
        <PromptDialog
          open={isEditOpen}
          onOpenChange={editDialog.toggle}
          title="编辑标签 / Edit Tag"
          description="输入标签名称 / Enter Tag Name:"
          defaultValue={editingTag.name}
          onConfirm={async (n: string) => {
            if (n && n.trim()) {
              try {
                await updateTag(String(editingTag.id), n.trim());
              } catch (err: unknown) {
                ErrorFactory.handle(err, "编辑标签失败");
              }
            }
          }}
        />
      )}
    </>
  );
}
