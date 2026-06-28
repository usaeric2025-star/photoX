import { usePhotoEditSessionContext } from "@/hooks/photo";
import React from "react";
import { Icon } from '@/components/ui/Icon';
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner';
import { PhotoEditFormData } from "@/schemas/photoEdit";
import {
  usePhoto,
  useRemoveFromGroupMutation,
  useAdminMaintenance,
  usePhotoDelete,
  useFilters,
} from "@/hooks";
import { useTask, useUI } from '@/lib/store';
import { showToast } from "@/lib/ui/toast";
import { ErrorFactory } from "@/lib/error/ErrorFactory";
import { usePhotoEditAI } from "./usePhotoEditAI";

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
  const tasksMap = useTask(s => s.tasks);
  const tasks = React.useMemo(() => Array.from(tasksMap.values()), [tasksMap]);
  const isAnalyzing = tasks.some(t => t.state?.status === 'processing' && (t.label.includes('识别') || t.label.includes('分析') || t.label.toLowerCase().includes('analyze') || t.label.toLowerCase().includes('identif')));

  const { mutateAsync: removeFromGroup } = useRemoveFromGroupMutation();
  const { updatePhoto: { mutateAsync: updateAdminPhoto } } = useAdminMaintenance();
  const { mutateAsync: deletePhoto } = usePhotoDelete();
  
  const { handleAiAnalyze } = usePhotoEditAI();

  const isPartOfGroup = !!detailPhoto?.group_id;

  const onRemoveFromGroup = async () => {
    if (editPhotoId && detailPhoto?.group_id) {
      await removeFromGroup({ photoIds: [editPhotoId], groupId: detailPhoto.group_id });
      onClose();
    }
  };

  const onAiAnalyze = async () => {
    const finalImageUrl = detailPhoto?.image_url;
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
      <div className="flex-none flex items-center gap-2">
      </div>

      <div className="flex-1 flex flex-col items-center justify-center min-w-0 px-2">
        <h2 className="font-black text-sm text-slate-800 tracking-tight leading-tight uppercase truncate w-full text-center">
          {editPhotoId ? l.editTitle : l.analyzeTitle}
        </h2>
      </div>

      <div className="flex-1 flex items-center justify-end gap-2">
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
          <form.Subscribe selector={(state: { values: PhotoEditFormData }) => state.values.is_group_cover}>
            {(isGroupCover: boolean | undefined) => {
              const active = !!isGroupCover;
              return (
                <button
                  type="button"
                  onClick={() => {
                    const newState = !active;
                    form.setFieldValue('is_group_cover', newState);
                    showToast.success(newState ? '已设为封面' : '已取消封面');
                  }}
                  title={l.cover}
                  className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl border border-amber-200 shadow-sm transition-all ${active ? "bg-amber-500 text-white border-amber-500 hover:bg-amber-600" : "bg-white text-amber-500 border-amber-200 hover:bg-amber-50 active:scale-95"}`}
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
