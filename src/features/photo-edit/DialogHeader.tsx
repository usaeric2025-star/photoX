import React from "react";
import { usePhotoEditSessionContext } from "./hooks/PhotoEditSession.js";
import { Icon } from '#src/components/ui/Icon.js';
import { LoadingSpinner } from '#src/components/ui/feedback/LoadingSpinner.js';
import { type PhotoEditFormData } from "#lib/valibot/schemas/photo.js";
import { useTranslation } from '#src/hooks/index.js';
import { useDialogHeaderActions } from "./hooks/useDialogHeaderActions.js";

interface DialogHeaderProps {
  onClose: () => void;
}

/**
 * DialogHeader
 * 
 * 照片編輯對話框的首部，包含 AI 識別、移出合組與保存按鈕。
 */
export function DialogHeader({
  onClose,
}: DialogHeaderProps) {
  const { t } = useTranslation();
  const { form } = usePhotoEditSessionContext();
  
  const {
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
  } = useDialogHeaderActions(onClose);

  const l = {
    editTitle: t('editPhoto') || '编辑照片 / Edit Photo',
    analyzeTitle: t('analyzePhoto') || '分析照片 / Analyze Photo',
    cover: t('cover') || '封面 / Cover',
  };

  return (
    <div className="flex items-center justify-between gap-3 w-full">
      <div className="flex-1 min-w-0">
        <h2 className="font-black text-sm sm:text-base text-slate-800 tracking-tight leading-tight uppercase truncate">
          {editPhotoId ? l.editTitle : l.analyzeTitle}
        </h2>
        <div className="flex items-center gap-2 mt-0.5">
          {isSubmitting && (
            <div className="flex items-center gap-1.5 text-[10px] text-blue-500 font-bold animate-pulse">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              {t('saving') || 'SAVING...'}
            </div>
          )}
          {!isSubmitting && isAutoSaving && (
            <div className="flex items-center gap-1.5 text-[10px] text-purple-500 font-bold">
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" />
              {t('syncing') || 'SYNCING...'}
            </div>
          )}
          {!isSubmitting && !isAutoSaving && form.state.isDirty && (
            <div className="text-[10px] text-amber-500 font-bold">
              {t('unsaved') || 'UNSAVED CHANGES'}
            </div>
          )}
          {!isSubmitting && !isAutoSaving && !form.state.isDirty && (
            <div className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
              <Icon name="check" size={10} />
              {t('saved') || 'SAVED'}
            </div>
          )}
        </div>
        {aiMessage && (
          <div className="mt-1 px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-[10px] font-semibold animate-in fade-in flex items-center gap-2 max-w-fit truncate">
            <LoadingSpinner size="xs" />
            <span className="truncate">{aiMessage}</span>
          </div>
        )}
      </div>

      <div className="flex-none flex items-center justify-end gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1.5">
          {/* AI 識別 */}
          <button
            type="button"
            onClick={onAiAnalyze}
            disabled={isAnalyzing || isPending}
            className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl border border-slate-100 shadow-sm transition-all disabled:opacity-50 ${isAnalyzing ? "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed" : "bg-purple-50 text-purple-600 border-purple-100 active:bg-purple-200"}`}
            title={t('aiRecognize') || 'AI 識別'}
          >
            {isAnalyzing ? (
              <LoadingSpinner size="xs" />
            ) : (
              <Icon name="sparkles" size={18} />
            )}
          </button>
        </div>



        {/* 移出合組 */}
        {isPartOfGroup && (
          <button
            type="button"
            onClick={onRemoveFromGroup}
            title={t('removeFromGroup') || "移出合組"}
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 border border-slate-200 shadow-sm hover:bg-slate-200 active:scale-95 transition-all"
          >
            <Icon name="log-out" size={18} />
          </button>
        )}



        {/* 保存按鈕 */}
        <button
          type="button"
          onClick={onSave}
          disabled={isSubmitting || isAnalyzing}
          className={`h-10 px-3 flex-shrink-0 flex items-center justify-center gap-2 rounded-xl border border-blue-600 shadow-sm transition-all disabled:opacity-50 ${isSubmitting || isAnalyzing ? "bg-blue-400 text-white border-blue-400 cursor-wait" : "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20 active:bg-blue-700"}`}
          title={t('save') || '保存'}
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="xs" variant="current" />
              <span className="text-xs font-bold hidden sm:inline uppercase">{t('saving') || '保存中'}</span>
            </>
          ) : (
            <>
              <Icon name="save" size={18} />
              <span className="text-xs font-bold hidden sm:inline uppercase">{t('save') || '保存'}</span>
            </>
          )}
        </button>

        {/* 關閉按鈕 */}
        <button
          type="button"
          onClick={onClose}
          className="h-10 px-3 flex-shrink-0 flex items-center justify-center gap-1.5 text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 transition-all rounded-xl ml-1 border border-transparent hover:border-red-100 group"
          title={t('close') || '关闭'}
        >
          <span className="text-xs font-bold hidden sm:inline group-hover:text-red-600 transition-colors uppercase">
            {t('close') || '关闭'}
          </span>
          <Icon name="x" size={20} />
        </button>
      </div>
    </div>
  );
}
