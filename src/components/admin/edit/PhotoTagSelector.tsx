import React from 'react';
import { TagEditor } from '../TagEditor';
import { Tag } from '../../../types';
import { useGalleryStore } from '../../../store';
import { safeArray } from '../../../lib/utils';

interface PhotoTagSelectorProps {
  tags: Tag[];
  selectedTagIds: string[];
  onChange: (newIds: string[]) => void;
  addTag: (name: string) => Promise<any>;
  updateTag: (id: string, name: string) => Promise<any>;
  deleteTag: (id: string) => Promise<any>;
}

export const PhotoTagSelector: React.FC<PhotoTagSelectorProps> = ({
  tags,
  selectedTagIds,
  onChange,
  addTag,
  updateTag,
  deleteTag
}) => {
  const { setPromptDialog } = useGalleryStore();

  const cleanSelectedIds = React.useMemo(() => {
    return Array.from(new Set(
      safeArray(selectedTagIds)
        .map(id => String(id).trim())
        .filter(Boolean)
    ));
  }, [selectedTagIds]);

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
      onChange(cleanSelectedIds.filter(id => id !== strId));
    } else if (cleanSelectedIds.length < 3) {
      onChange([...cleanSelectedIds, strId]);
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
          if (cleanSelectedIds.length < 3) {
            onChange([...new Set([...cleanSelectedIds, String(existing.id)])]);
          }
          return;
        }

        const saved = await addTag(trimmed);
        if (saved) {
          if (cleanSelectedIds.length < 3) {
            onChange([...new Set([...cleanSelectedIds, String(saved.id)])]);
          }
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
      selectedTagIds={cleanSelectedIds} 
      onToggleTag={handleToggleTag}
      onUpdateTag={updateTag}
      onDeleteTag={deleteTag}
      onQuickAdd={onQuickAdd}
      onRenameTagRequest={onRenameTagRequest}
      showHotEffects={false}
    />
  );
};
