import { useState, useCallback, useEffect } from 'react';
import { isEqual } from 'lodash-es';
import { Photo } from '@/types';
import { usePhoto } from './usePhoto';
import { usePhotoEditMutation } from '@/hooks/photo/usePhotoMutations';

export const usePhotoEditSession = (photoId: string) => {
  const { data: photo, isLoading } = usePhoto(photoId);
  const [draft, setDraft] = useState<Photo | null>(null);
  
  // Refactor to use new Mutation infra soon
  const updateMutation = usePhotoEditMutation();

  useEffect(() => {
    if (photo) {
      setDraft(photo);
    }
  }, [photo]);

  const commit = useCallback(async () => {
    if (!draft || !photoId) return;
    await updateMutation.mutateAsync({ id: photoId, updates: draft });
  }, [draft, photoId, updateMutation]);

  const discard = useCallback(() => {
    if (photo) setDraft(photo);
  }, [photo]);

  const isDirty = !isEqual(photo, draft);

  return {
    session: draft,
    setSession: setDraft,
    isDirty,
    isLoading,
    commit,
    discard,
  };
};
