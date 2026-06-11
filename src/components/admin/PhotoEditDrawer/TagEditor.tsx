import React from 'react';
import { PhotoTagSelector } from '../edit/PhotoTagSelector';
import { useTags, useTagCreate, useTagEdit, useTagDelete } from '../../../hooks';
import { getTagIds, getTagsFromIds } from '../../../services/photo/utils';
import { PhotoEditFormReturn } from '@/hooks/photo/usePhotoEdit';

import { ProductFormData } from '@/types';

interface TagSelectorProps {
  form: PhotoEditFormReturn;
}

/**
 * Encapsulated Tag Selector for Photo Edit Drawer
 */
export function TagEditor({ form }: TagSelectorProps) {
  const { data: tags = [] } = useTags();
  
  const { mutateAsync: addTagMut } = useTagCreate();
  const { mutateAsync: updateTagMut } = useTagEdit();
  const { mutateAsync: deleteTagMut } = useTagDelete();

  const formState = form.values;
  const currentTags = formState.tags;

  const updateForm = React.useCallback((updates: Partial<ProductFormData>) => form.setValues(updates), [form]);

  const handleChange = React.useCallback((newIds: string[]) => {
    const newTags = getTagsFromIds(newIds, tags);
    updateForm({ tags: newTags });
  }, [tags, updateForm]);

  const handleAdd = React.useCallback(async (name: string) => {
    const res = await addTagMut(name);
    return res.id;
  }, [addTagMut]);

  const handleUpdate = React.useCallback((id: string, name: string) => updateTagMut({ id, updates: { name } }), [updateTagMut]);
  const handleDelete = React.useCallback((id: string) => deleteTagMut(id), [deleteTagMut]);

  return (
    <section className="space-y-2">
      <PhotoTagSelector 
        tags={tags}
        selectedTagIds={getTagIds(currentTags)}
        onChange={handleChange}
        addTag={handleAdd}
        updateTag={handleUpdate}
        deleteTag={handleDelete}
      />
    </section>
  );
}
