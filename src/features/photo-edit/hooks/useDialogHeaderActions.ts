import { usePhotoEditSessionContext } from "./PhotoEditSession.js";
import { usePhoto, useAdminActions, useFilters, useTranslation } from '#src/hooks/index.js';
import { usePhotoEditAI } from './usePhotoAI.js';
import { useAtomValue } from "jotai";
import {  tasksAtom } from '#lib/store/index.js';
import { Task } from '#lib/task-queue/types.js';
import { feedback } from '#lib/feedback.js';
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
  const { commit, isPending, isSubmitting, isAutoSaving } = usePhotoEditSessionContext();
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
      await feedback.promise(
        removePhotos.mutateAsync({ photoIds: [editPhotoId], groupId: detailPhoto.groupId }),
        { 
          loading: t('removingFromGroup') || '正在移出合組...', 
          success: t('removedFromGroup') || '已移出合組',
          error: t('removeFromGroupFailed') || '移出失敗'
        }
      );
      onClose();
    }
  };

  const onAiAnalyze = async () => {
    const finalImageUrl = detailPhoto?.imageUrl;
    if (finalImageUrl) {
      await feedback.promise(
        handleAiAnalyze(finalImageUrl),
        {
          loading: t('aiAnalyzing') || '正在 AI 識別...',
          success: t('aiAnalyzeSuccess') || 'AI 識別完成',
          error: (err: { message: string }) => `${t('aiAnalyzeFailed') || 'AI 識別失敗'}: ${err.message}`
        }
      );
    } else {
      feedback.error(t('photoDataMissing') || '照片數據缺失');
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
    isAutoSaving,
    isAnalyzing,
    aiMessage,
    isPartOfGroup,
    editPhotoId,
    onRemoveFromGroup,
    onAiAnalyze,
    onSave
  };
}
