import React, { useState, useCallback } from "react";
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { useFormContext, useField } from "el-form-react-hooks";
import { PromptDialog } from "@/components/ui/PromptDialog";
import { TagEditor as TagEditorContent } from "./TagEditorContent";
import { MAX_TAGS_PER_PHOTO } from "@/constants/limits";
import { Tag } from "@/types";
import { safeArray } from "@/lib/utils";
import { useFormSubmit } from '@/lib/form/useFormSubmit';
import { type } from 'arktype';
import { FormProvider } from '@/lib/form/useFormField';

interface BasePhotoTagSelectorProps {
  selectedTagIds: string[];
  onChange: (ids: string[]) => void;
  addTag: (name: string) => Promise<string | null>;
  updateTag: (id: string, name: string) => Promise<unknown>;
  deleteTag: (id: string) => Promise<unknown>;
  tags: Tag[];
  hideHotLabel?: boolean;
}

function BasePhotoTagSelector({
  selectedTagIds,
  onChange,
  addTag: rawAddTag,
  updateTag: rawUpdateTag,
  deleteTag,
  tags,
  hideHotLabel,
}: BasePhotoTagSelectorProps) {
  const [isAddOpen, addDialog] = useDisclosure(false);
  const [isEditOpen, editDialog] = useDisclosure(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const cleanSelectedIds = Array.from(
    new Set(
      safeArray(selectedTagIds)
        .map((item) => {
          if (typeof item === 'object' && item !== null) {
            return String((item as { id?: string | number }).id || '').trim();
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
      if (cleanSelectedIds.length >= MAX_TAGS_PER_PHOTO) {
        // Warning is fine as static feedback
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

  const { submit: runAddTag, isLoading: isAdding, fieldErrors: addFieldErrors, clearFieldError: addClearFieldError } = useFormSubmit({
    schema: type({ name: "string > 0" }),
    mutationFn: async ({ name }) => {
      const trimmed = name.trim();
      if (!trimmed) return null;

      const existing = tags.find(
        (t) => t.name.toUpperCase() === trimmed.toUpperCase(),
      );
      if (existing) {
        onChange([...new Set([...cleanSelectedIds, String(existing.id)])]);
        return "existing";
      }

      const saved = await rawAddTag(trimmed);
      if (saved) {
        onChange([...new Set([...cleanSelectedIds, String(saved)])]);
      }
      return saved;
    },
    successMessage: "標籤操作成功 / Tag operation successful",
    errorMessage: "新增標籤失敗 / Add tag failed"
  });

  const { submit: runUpdateTag, isLoading: isUpdating, fieldErrors: editFieldErrors, clearFieldError: editClearFieldError } = useFormSubmit({
    schema: type({ id: "string", name: "string > 0" }),
    mutationFn: async ({ id, name }) => {
      await rawUpdateTag(id, name.trim());
      return true;
    },
    successMessage: "標籤已更新 / Tag updated",
    errorMessage: "編輯標籤失敗 / Edit tag failed"
  });

  return (
    <>
      <TagEditorContent
        tags={sortedTags}
        selectedTagIds={cleanSelectedIds}
        onToggleTag={handleToggleTag}
        onUpdateTag={async (id, name) => {
           return await runUpdateTag({ id, name });
        }}
        onDeleteTag={deleteTag}
        onQuickAdd={onQuickAdd}
        onRenameTagRequest={onRenameTagRequest}
        showHotEffects={false}
        hideHotLabel={hideHotLabel}
      />
      <FormProvider fieldErrors={addFieldErrors} clearFieldError={addClearFieldError}>
        <PromptDialog
          open={isAddOpen}
          onOpenChange={addDialog.toggle}
          loading={isAdding}
          title="新增標籤 / Add Tag"
          description="輸入標籤名稱 / Enter Tag Name"
          onConfirm={async (name: string) => {
            if (!name.trim()) return false;
            return await runAddTag({ name });
          }}
        />
      </FormProvider>
      {editingTag && (
        <FormProvider fieldErrors={editFieldErrors} clearFieldError={editClearFieldError}>
          <PromptDialog
            open={isEditOpen}
            onOpenChange={editDialog.toggle}
            loading={isUpdating}
            title="編輯標籤 / Edit Tag"
            description="輸入標籤名稱 / Enter Tag Name:"
            defaultValue={editingTag.name}
            onConfirm={async (n: string) => {
              if (n && n.trim()) {
                return await runUpdateTag({ id: String(editingTag.id), name: n });
              }
              return false;
            }}
          />
        </FormProvider>
      )}
    </>
  );
}

interface PhotoTagSelectorProps {
  name: string;
  addTag: (name: string) => Promise<string | null>;
  updateTag: (id: string, name: string) => Promise<unknown>;
  deleteTag: (id: string) => Promise<unknown>;
  tags: Tag[];
  control?: any; // kept for compatibility but ignored
  value?: (string | { id: string | number })[];
  onChange?: (val: (string | { id: string | number })[]) => void;
  hideHotLabel?: boolean;
}

export function PhotoTagSelector(props: PhotoTagSelectorProps) {
  let hasContext = false;
  try {
    hasContext = !!useFormContext();
  } catch (e) {
    hasContext = false;
  }

  if (props.name && hasContext) {
    return <ControlledPhotoTagSelector {...props} />;
  }

  return (
    <BasePhotoTagSelector
      selectedTagIds={(props.value || []).map(v => typeof v === 'object' ? String(v.id) : v)}
      onChange={props.onChange || (() => {})}
      addTag={props.addTag}
      updateTag={props.updateTag}
      deleteTag={props.deleteTag}
      tags={props.tags}
      hideHotLabel={props.hideHotLabel}
    />
  );
}

function ControlledPhotoTagSelector({
  name,
  addTag,
  updateTag,
  deleteTag,
  tags,
  hideHotLabel,
}: PhotoTagSelectorProps) {
  const { form } = useFormContext();
  const { value } = useField(name as any);

  let arrValue: any[] = [];
  if (Array.isArray(value)) {
    arrValue = value;
  }

  return (
    <BasePhotoTagSelector
      selectedTagIds={arrValue.map((v: unknown) => {
        if (typeof v === 'object' && v !== null && 'id' in v) {
          return String((v as { id: string | number }).id);
        }
        return String(v);
      })}
      onChange={(v) => form.setValue(name as any, v)}
      addTag={addTag}
      updateTag={updateTag}
      deleteTag={deleteTag}
      tags={tags}
      hideHotLabel={hideHotLabel}
    />
  );
}
