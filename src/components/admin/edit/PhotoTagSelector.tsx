import React from 'react';
import { toast } from 'sonner';
import { TagEditor } from '../TagEditor';
import { Tag } from '../../../types';
import { useAdminUI } from '../../../context/AdminContexts';

interface PhotoTagSelectorProps {
  tags: Tag[];
  selectedTagIds: string[];
  onChange: (newIds: string[]) => void;
  addTag: (name: string) => Promise<Tag | null>;
  updateTag: (id: string, name: string) => Promise<boolean>;
  deleteTag: (id: string) => Promise<boolean>;
}

export const PhotoTagSelector: React.FC<PhotoTagSelectorProps> = ({
  tags,
  selectedTagIds,
  onChange,
  addTag,
  updateTag,
  deleteTag
}) => {
  const { setPromptDialog } = useAdminUI();
  const sortedTags = [...tags].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const handleToggleTag = (tag: Tag) => {
    const strId = String(tag.id);
    if (selectedTagIds.includes(strId)) {
      onChange(selectedTagIds.filter(id => id !== strId));
    } else if (selectedTagIds.length < 3) {
      onChange([...selectedTagIds, strId]);
    } else {
      toast.info('最多选 3 个');
    }
  };

  const onQuickAdd = () => {
    setPromptDialog({
      title: '新增标签 / Add Tag',
      message: '输入标签名称 / Enter Tag Name',
      onSubmit: async (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        
        const existing = tags.find(t => t.name.toUpperCase() === trimmed.toUpperCase());
        if (existing) {
          if (selectedTagIds.length < 3) {
            onChange([...new Set([...selectedTagIds, String(existing.id)])]);
          }
          toast.success(`标签 "${trimmed}" 已存在 (自动选择)`);
          return;
        }

        const saved = await addTag(trimmed);
        if (saved) {
          if (selectedTagIds.length < 3) {
            onChange([...new Set([...selectedTagIds, String(saved.id)])]);
          }
          toast.success(`已新增标签 "${trimmed}"`);
        }
      }
    });
  };

  const onRenameTagRequest = (tag: Tag) => {
    setPromptDialog({
      title: '编辑标签 / Edit Tag',
      message: "输入标签名称 / Enter Tag Name:",
      placeholder: tag.name,
      onSubmit: (n: string) => {
        if(n && n.trim()) { 
          updateTag(String(tag.id), n.trim()); 
        }
      }
    });
  };

  return (
    <TagEditor 
      tags={sortedTags} 
      selectedTagIds={selectedTagIds} 
      onToggleTag={handleToggleTag}
      onUpdateTag={updateTag}
      onDeleteTag={deleteTag}
      onQuickAdd={onQuickAdd}
      onRenameTagRequest={onRenameTagRequest}
      showHotEffects={false}
    />
  );
};
