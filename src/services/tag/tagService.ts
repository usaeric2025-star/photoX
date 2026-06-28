import useSWR, { useSWRConfig } from 'swr';
import { useState } from 'react';
import { loadTagsFromCloud } from './queries';
import { addTagToDB, updateTagInDB, deleteTagFromDB } from './commands';
import { queryKeys } from '@/lib/query/keys';
import { errorService } from '@/services/error';
import { Tag } from '@/types';

export function useTags() {
  const { data, error, isLoading, mutate } = useSWR<Tag[], any>(
    queryKeys.tags.all,
    loadTagsFromCloud,
    {}
  );

  return {
    tags: data || [],
    isLoading,
    error,
    mutate,
  };
}

export function useTagMutations() {
  const { mutate } = useSWRConfig();
  const [isMutating, setIsMutating] = useState(false);

  const add = async (name: string) => {
    setIsMutating(true);
    try {
      await addTagToDB(name);
      mutate(queryKeys.tags.all);
    } catch (e) {
      errorService.handle(e, { context: 'tag.add' });
      throw e;
    } finally {
      setIsMutating(false);
    }
  };

  const update = async (id: number, updates: Partial<Tag>) => {
    setIsMutating(true);
    try {
      await updateTagInDB(id, updates);
      mutate(queryKeys.tags.all);
    } catch (e) {
      errorService.handle(e, { context: 'tag.update' });
      throw e;
    } finally {
      setIsMutating(false);
    }
  };

  const remove = async (id: number) => {
    setIsMutating(true);
    try {
      await deleteTagFromDB(id);
      mutate(queryKeys.tags.all);
    } catch (e) {
      errorService.handle(e, { context: 'tag.delete' });
      throw e;
    } finally {
      setIsMutating(false);
    }
  };

  return {
    add,
    update,
    remove,
    isMutating,
  };
}
