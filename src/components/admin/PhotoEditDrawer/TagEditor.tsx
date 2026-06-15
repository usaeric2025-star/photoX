import React from 'react';
import { usePhotoEditSessionContext } from '@/hooks/photo/usePhotoEditSessionContext';
import { PhotoTagSelector } from '../edit/PhotoTagSelector';
import { useTags, useTagCreate, useTagEdit, useTagDelete } from '../../../hooks';

/**
 * Encapsulated Tag Selector for Photo Edit Drawer
 */
export function TagEditor() {
  const { control } = usePhotoEditSessionContext();
  const { data: tags = [] } = useTags();
  
  const { mutateAsync: addTagMut } = useTagCreate();
  const { mutateAsync: updateTagMut } = useTagEdit();
  const { mutateAsync: deleteTagMut } = useTagDelete();

  const handleAdd = async (name: string) => {
    const res = await addTagMut(name);
    return res.id;
  };

  const handleUpdate = (id: string, name: string) => updateTagMut({ id, updates: { name } });
  const handleDelete = (id: string) => deleteTagMut(id);

  return (
    <section className="space-y-2">
      <PhotoTagSelector 
        name="tags"
        tags={tags}
        addTag={handleAdd}
        updateTag={handleUpdate}
        deleteTag={handleDelete}
        control={control}
      />
    </section>
  );
}
