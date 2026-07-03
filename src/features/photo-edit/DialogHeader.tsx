import { usePhotoEditSessionContext } from "#src/hooks/photo/index.js";
import React from "react";
import { Icon } from '#src/components/ui/Icon.js';
import { LoadingSpinner } from '#src/components/ui/feedback/LoadingSpinner.js';
import { PhotoEditFormData } from "#src/schemas/photoEdit.js";
import {
  usePhoto,
  useRemoveFromGroupMutation,
  useAdminMaintenance,
  usePhotoDelete,
  useFilters,
} from '#src/hooks/index.js';
import { useSignal, useUI } from '#lib/store/index.js';
import { aiAnalysisSignal } from '#lib/ai/executor.js';
import { showToast } from "#lib/ui/toast.js";
import { ErrorFactory } from "#lib/error/ErrorFactory.js";
import { usePhotoEditAI } from "#src/hooks/index.js";
import { useGroupMutations } from "#src/hooks/group/index.js";

interface DialogHeaderProps {
  onClose: () => void;
  onDeleteClick: () => void;
}

export function DialogHeader({
  onClose,
  onDeleteClick,
}: DialogHeaderProps) {
  const { commit, isPending, isSubmitting, form } = usePhotoEditSessionContext();
  
  const { modal, photoId, setModal, setPhotoId } = useFilters();
  const editPhotoId = modal === 'edit' ? photoId : null;
  const appLang = useUI((s) => s.appLang);
  
  const { data: detailPhoto } = usePhoto(editPhotoId || '');
  const aiState = useSignal(aiAnalysisSignal);
  const isAnalyzing = aiState.status === 'processing';

  const { mutateAsync: removeFromGroup } = useRemoveFromGroupMutation();
  const { setCover } = useGroupMutations();
  const { updatePhoto: { mutateAsync: updateAdminPhoto } } = useAdminMaintenance();
  const { mutateAsync: deletePhoto } = usePhotoDelete();
  
  const { handleAiAnalyze } = usePhotoEditAI();

  const isPartOfGroup = !!detailPhoto?.groupId;

  const onRemoveFromGroup = async () => {
    if (editPhotoId && detailPhoto?.groupId) {
      await removeFromGroup({ photoIds: [editPhotoId], groupId: detailPhoto.groupId });
      onClose();
    }
  };

  const onAiAnalyze = async () => {
    const finalImageUrl = detailPhoto?.imageUrl;
    if (finalImageUrl) {
      await handleAiAnalyze(finalImageUrl);
    } else {
      ErrorFactory.handle(appLang === 'zh' ? '照片信息缺失，无法识别' : 'Photo data missing', { context: 'AI 识别' });
    }
  }

  const l = {
    hidden: 'Hide',
    visible: 'Show',
    editTitle: 'Edit Product',
    analyzeTitle: 'Analyze Product',
    cover: 'Cover',
  };

  return (
    <div className="px-4 py-3 border-b border-slate-200 bg-white shadow-sm flex items-center justify-between gap-3 min-h-[72px]">
      <div className="flex-1 min-w-0">
        <h2 className="font-black text-sm sm:text-base text-slate-800 tracking-tight leading-tight uppercase truncate">
          {editPhotoId ? l.editTitle : l.analyzeTitle}
        </h2>
      </div>

      <div className="flex-none flex items-center justify-end gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onAiAnalyze}
            disabled={isAnalyzing || isPending}
            className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl border border-slate-100 shadow-sm transition-all disabled:opacity-50 ${isAnalyzing ? "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed" : "bg-purple-50 text-purple-600 border-purple-100 active:bg-purple-200"}`}
          >
            {isAnalyzing ? (
              <LoadingSpinner size="xs" />
            ) : (
              <Icon name="sparkles" size={18} />
            )}
          </button>
        </div>

        {isPartOfGroup && (
          <form.Subscribe selector={(state: { values: PhotoEditFormData }) => state.values.isGroupCover}>
            {(isGroupCover: boolean | undefined) => {
              const active = !!isGroupCover;
              return (
                <button
                  type="button"
                  onClick={async () => {
                    const newState = !active;
                    form.setFieldValue('isGroupCover', newState);
                    if (newState && detailPhoto?.groupId && editPhotoId) {
                      await setCover.mutateAsync({ groupId: detailPhoto.groupId, photoId: editPhotoId });
                    }
                  }}
                  title={l.cover}
                  disabled={setCover.isPending}
                  className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl border border-amber-200 shadow-sm transition-all ${active ? "bg-amber-500 text-white border-amber-500 hover:bg-amber-600" : "bg-white text-amber-500 border-amber-200 hover:bg-amber-50 active:scale-95"} ${setCover.isPending ? "opacity-50 cursor-wait" : ""}`}
                >
                  <Icon name="star" size={20} className={active ? "fill-white" : "fill-transparent"} />
                </button>
              );
            }}
          </form.Subscribe>
        )}

        {isPartOfGroup && (
          <button
            type="button"
            onClick={onRemoveFromGroup}
            title="移出合组"
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 border border-slate-200 shadow-sm hover:bg-slate-200 active:scale-95 transition-all"
          >
            <Icon name="log-out" size={18} />
          </button>
        )}

        {editPhotoId && (
          <button
            type="button"
            onClick={onDeleteClick}
            disabled={isPending || isAnalyzing}
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-red-50 text-red-500 border border-red-100 shadow-sm active:bg-red-100 transition-all font-bold disabled:opacity-50"
          >
            <Icon name="trash-2" size={18} />
          </button>
        )}

        <button
          type="button"
          onClick={async () => {
            await commit();
          }}
          disabled={isSubmitting || isAnalyzing}
          className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl border border-blue-600 shadow-sm transition-all disabled:opacity-50 ${isSubmitting || isAnalyzing ? "bg-blue-400 text-white border-blue-400 cursor-wait" : "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20 active:bg-blue-700"}`}
        >
          {isSubmitting || isAnalyzing ? (
            <LoadingSpinner size="xs" />
          ) : (
            <Icon name="save" size={18} />
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors rounded-full ml-1"
        >
          <Icon name="x" size={20} />
        </button>
      </div>
    </div>
  );
}
