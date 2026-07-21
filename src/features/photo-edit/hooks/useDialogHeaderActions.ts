import { usePhotoEditSessionContext } from "./PhotoEditSession.js";
import { usePhoto, useAdminActions, useFilters, useTranslation } from '#src/hooks/index.js';
import { usePhotoEditAI } from './usePhotoAI.js';
import { useAtomValue } from "jotai";
import {  tasksAtom } from '#lib/store/index.js';
import { Task } from '#lib/task-queue/types.js';
import { showToast } from "#lib/ui/toast.js";
import { ErrorFactory } from "#lib/error/ErrorFactory.js";
import { useGroupMutations } from "#src/hooks/group/index.js";
import { logger } from '#lib/logger.js';
import { useMemo } from 'react';

/**
 * useDialogHeaderActions
 * 
 * 封裝照片編輯對話框頭部的邏輯與動作。
 */
export function useDialogHeaderActions(onClose: () => void) {
  const { t } = useTranslation();
  const { commit, isPending, isSubmitting } = usePhotoEditSessionContext();
  const { modal, photoId: filterPhotoId } = useFilters();
  const editPhotoId = modal === 'edit' ? filterPhotoId : null;
  
  const { data: detailPhoto } = usePhoto(editPhotoId || '');
  const { setCover, removePhotos } = useGroupMutations();
  const { handleAiAnalyze, isAnalyzing } = usePhotoEditAI();
  
  const tasksMap = useAtomValue(tasksAtom) as Map<string, Task>;
  const aiTask = useMemo(() => 
    Array.from(tasksMap.values()).find((t) => t.type === 'ai-analyze' && t.state.status === 'processing'),
    [tasksMap]
  );
  
  const aiMessage = aiTask?.state.status === 'processing' ? aiTask.state.message : undefined;
  const isPartOfGroup = !!detailPhoto?.groupId;

  const onRemoveFromGroup = async () => {
    if (editPhotoId && detailPhoto?.groupId) {
      try {
        await removePhotos.mutateAsync({ photoIds: [editPhotoId], groupId: detailPhoto.groupId });
        showToast.success(t('removedFromGroup') || 'Removed from group');
        onClose();
      } catch (e) {
        ErrorFactory.handle(e as Error, { context: t('removeFromGroupAction') || '移出合組' });
      }
    }
  };

  const onAiAnalyze = async () => {
    const finalImageUrl = detailPhoto?.imageUrl;
    if (finalImageUrl) {
      try {
        await handleAiAnalyze(finalImageUrl);
      } catch (e) {
        ErrorFactory.handle(e as Error, { context: t('aiAnalyzeAction') || 'AI 識別' });
      }
    } else {
      ErrorFactory.handle(new Error(t('photoDataMissing') || 'Photo data missing'), { context: t('aiAnalyzeAction') || 'AI 識別' });
    }
  };

  const onSave = async () => {
    try {
      const success = await commit();
      if (success) {
        onClose();
      }
    } catch (e) {
      ErrorFactory.handle(e as Error, { context: '[PhotoEdit] Save error intercepted in header', silent: true });
    }
  };

  return {
    isPending,
    isSubmitting,
    isAnalyzing,
    aiMessage,
    isPartOfGroup,
    editPhotoId,
    onRemoveFromGroup,
    onAiAnalyze,
    onSave
  };
}
