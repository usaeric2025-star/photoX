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
  const updateForm = (updates: Partial<ProductFormData>) => form.setValues(updates);

  return (
    <section className="space-y-2">
      <PhotoTagSelector 
        tags={tags}
        selectedTagIds={getTagIds(formState.tags)}
        onChange={(newIds: string[]) => {
          const newTags = getTagsFromIds(newIds, tags);
          updateForm({ tags: newTags });
        }}
        addTag={async (name) => {
          const res = await addTagMut(name);
          return res.id;
        }}
        updateTag={(id, name) => updateTagMut({ id, updates: { name } })}
        deleteTag={(id) => deleteTagMut(id)}
      />
    </section>
  );
}
