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

  const handleAdd = React.useCallback(async (name: string) => {
    const res = await addTagMut(name);
    return res.id;
  }, [addTagMut]);

  const handleUpdate = React.useCallback((id: string, name: string) => updateTagMut({ id, updates: { name } }), [updateTagMut]);
  const handleDelete = React.useCallback((id: string) => deleteTagMut(id), [deleteTagMut]);

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
