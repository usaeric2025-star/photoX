import { useShallow } from "@/store/useUIStore";
import React from "react";
import { TagEditor } from "../TagEditor";
import { Tag } from "../../../types";
import { toast } from '@/lib/ui/toast';
import { useUIStore } from "../../../store";
import { safeArray } from "../../../lib/utils";
import { useErrorHandler } from "@/hooks";

interface PhotoTagSelectorProps {
  tags: Tag[];
  selectedTagIds: string[];
  onChange: (newIds: string[]) => void;
  addTag: (name: string) => Promise<any>;
  updateTag: (id: string, name: string) => Promise<any>;
  deleteTag: (id: string) => Promise<any>;
}

export function PhotoTagSelector({
  tags,
  selectedTagIds,
  onChange,
  addTag,
  updateTag,
  deleteTag,
}: PhotoTagSelectorProps) {
  const update = useUIStore((s) => s.update);
  const { handleError } = useErrorHandler();

  const cleanSelectedIds = React.useMemo(() => {
    return Array.from(
      new Set(
        safeArray(selectedTagIds)
          .map((id) => String(id).trim())
          .filter(Boolean),
      ),
    );
  }, [selectedTagIds]);

  const [initialSelectedIds] = React.useState(() => cleanSelectedIds);

  const sortedTags = React.useMemo(() => {
    return [...tags].sort((a, b) => {
      const isASelected = initialSelectedIds.includes(String(a.id));
      const isBSelected = initialSelectedIds.includes(String(b.id));

      if (isASelected && !isBSelected) return -1;
      if (!isASelected && isBSelected) return 1;

      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
  }, [tags, initialSelectedIds]);

  const handleToggleTag = (tag: Tag) => {
    const strId = String(tag.id);
    if (cleanSelectedIds.includes(strId)) {
      onChange(cleanSelectedIds.filter((id) => id !== strId));
    } else if (cleanSelectedIds.length < 3) {
      onChange([...cleanSelectedIds, strId]);
    }
  };

  const onQuickAdd = () => {
    update({
      promptDialog: {
        title: "新增标签 / Add Tag",
        message: "输入标签名称 / Enter Tag Name",
        onSubmit: async (name: string) => {
          const trimmed = name.trim();
          if (!trimmed) return;

          const existing = tags.find(
            (t) => t.name.toUpperCase() === trimmed.toUpperCase(),
          );
          if (existing) {
            if (cleanSelectedIds.length < 3) {
              onChange([
                ...new Set([...cleanSelectedIds, String(existing.id)]),
              ]);
            }
            return;
          }

          try {
            const saved = await addTag(trimmed);
            if (saved) {
              if (cleanSelectedIds.length < 3) {
                onChange([...new Set([...cleanSelectedIds, String(saved)])]);
              }
            }
          } catch (err: any) {
            handleError(err, "新增标签失败");
          }
        },
      },
    });
  };

  const onRenameTagRequest = (tag: Tag) => {
    update({
      promptDialog: {
        title: "编辑标签 / Edit Tag",
        message: "输入标签名称 / Enter Tag Name:",
        placeholder: tag.name,
        onSubmit: async (n: string) => {
          if (n && n.trim()) {
            try {
              await updateTag(String(tag.id), n.trim());
            } catch (err: any) {
              handleError(err, "编辑标签失败");
            }
          }
        },
      },
    });
  };

  return (
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
  );
}
