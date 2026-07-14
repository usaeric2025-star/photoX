import { usePhotoEditSessionContext } from "./PhotoEditSession.js";
import { usePhoto, useRemoveFromGroupMutation, useAdminActions, useFilters, useTranslation } from '#src/hooks/index.js';
import { usePhotoEditAI } from './usePhotoAI.js';
import { useUI, tasksSignal, useSignal } from '#lib/store/index.js';
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
  const { modal, photoId } = useFilters();
  const editPhotoId = modal === 'edit' ? photoId : null;
  const appLang = useUI((s) => s.appLang);
  
  const { data: detailPhoto } = usePhoto(editPhotoId || '');
  
  const { mutateAsync: removeFromGroup } = useRemoveFromGroupMutation();
  const { setCover } = useGroupMutations();
  const { handleAiAnalyze, isAnalyzing } = usePhotoEditAI();
  
  const tasksMap = useSignal(tasksSignal) as Map<string, Task>;
  const aiTask = useMemo(() => 
    Array.from(tasksMap.values()).find((t) => t.type === 'ai-analyze' && t.state.status === 'processing'),
    [tasksMap]
  );
  const aiMessage = aiTask?.state.status === 'processing' ? aiTask.state.message : undefined;
  
  const isPartOfGroup = !!detailPhoto?.groupId;

  const onRemoveFromGroup = async () => {
    if (editPhotoId && detailPhoto?.groupId) {
      try {
        await removeFromGroup({ photoIds: [editPhotoId], groupId: detailPhoto.groupId });
        showToast.success(t('removedFromGroup') || 'Removed from group');
        onClose();
      } catch (e) {
        ErrorFactory.handle(e, { context: t('removeFromGroupAction') || '移出合組' });
      }
    }
  };

  const onAiAnalyze = async () => {
    const finalImageUrl = detailPhoto?.imageUrl;
    if (finalImageUrl) {
      try {
        await handleAiAnalyze(finalImageUrl);
        showToast.success(t('analysisRequestSent') || 'Analysis request sent');
      } catch (e) {
        ErrorFactory.handle(e, { context: t('aiAnalyzeAction') || 'AI 識別' });
      }
    } else {
      ErrorFactory.handle(t('photoDataMissing') || 'Photo data missing', { context: t('aiAnalyzeAction') || 'AI 識別' });
    }
  };

  const onSave = async () => {
    try {
      await commit();
      onClose();
    } catch (e) {
      logger.error('[PhotoEdit] Save error intercepted in header', e);
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
    onSave,
    isCoverPending: setCover.isPending,
    setCover: async (newState: boolean) => {
       if (newState && detailPhoto?.groupId && editPhotoId) {
         await setCover.mutateAsync({ groupId: detailPhoto.groupId, photoId: editPhotoId });
         showToast.success(t('setAsCoverSuccess') || 'Set as cover');
       }
    }
  };
}
