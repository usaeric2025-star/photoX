import React, { useState } from "react";
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { Control, useController, useFormContext } from "react-hook-form";
import { PromptDialog } from "@/components/ui/PromptDialog";
import { TagEditor } from "../TagEditor";
import { Tag } from "../../../types";
import { safeArray } from "../../../lib/utils";
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { showToast } from '@/lib/ui/toast';

interface BasePhotoTagSelectorProps {
  selectedTagIds: string[];
  onChange: (ids: string[]) => void;
  addTag: (name: string) => Promise<any>;
  updateTag: (id: string, name: string) => Promise<any>;
  deleteTag: (id: string) => Promise<any>;
  tags: Tag[];
}

function BasePhotoTagSelector({
  selectedTagIds,
  onChange,
  addTag,
  updateTag,
  deleteTag,
  tags,
}: BasePhotoTagSelectorProps) {
  const [isAddOpen, addDialog] = useDisclosure(false);
  const [isEditOpen, editDialog] = useDisclosure(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const cleanSelectedIds = Array.from(
    new Set(
      safeArray(selectedTagIds)
        .map((item) => {
          if (typeof item === 'object' && item !== null) {
            return String((item as any).id || '').trim();
          }
          return String(item || '').trim();
        })
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
      if (cleanSelectedIds.length >= 3) {
        showToast.warning("最多只能选择 3 个标签 / Maximum of 3 tags allowed");
        return;
      }
      onChange([...cleanSelectedIds, strId]);
    }
  };

  const onQuickAdd = () => addDialog.open();
  const onRenameTagRequest = (tag: Tag) => {
    setEditingTag(tag);
    editDialog.open();
  };

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
            onChange([...new Set([...cleanSelectedIds, String(existing.id)])]);
            return;
          }

          try {
            const saved = await addTag(trimmed);
            if (saved) {
              onChange([...new Set([...cleanSelectedIds, String(saved)])]);
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

interface PhotoTagSelectorProps {
  name: string;
  addTag: (name: string) => Promise<any>;
  updateTag: (id: string, name: string) => Promise<any>;
  deleteTag: (id: string) => Promise<any>;
  tags: Tag[];
  control?: any;
  value?: any[];
  onChange?: (val: any[]) => void;
}

export function PhotoTagSelector(props: PhotoTagSelectorProps) {
  const context = useFormContext();
  const control = props.control || context?.control;

  if (props.name && control) {
    return <ControlledPhotoTagSelector {...props} control={control} />;
  }

  return (
    <BasePhotoTagSelector
      selectedTagIds={props.value || []}
      onChange={props.onChange || (() => {})}
      addTag={props.addTag}
      updateTag={props.updateTag}
      deleteTag={props.deleteTag}
      tags={props.tags}
    />
  );
}

function ControlledPhotoTagSelector({
  name,
  addTag,
  updateTag,
  deleteTag,
  tags,
  control,
}: PhotoTagSelectorProps) {
  const { field } = useController({
    name,
    control,
    defaultValue: []
  });

  return (
    <BasePhotoTagSelector
      selectedTagIds={field.value || []}
      onChange={field.onChange}
      addTag={addTag}
      updateTag={updateTag}
      deleteTag={deleteTag}
      tags={tags}
    />
  );
}
