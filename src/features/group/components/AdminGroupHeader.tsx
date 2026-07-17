import React, { useState } from 'react';
import { Group } from '#src/types/index.js';
import { Icon } from '#src/components/ui/Icon.js';
import { useIsMultiSelect, useSelectionActions, usePermission } from '#src/hooks/index.js';
import { copyToClipboard } from '#src/utils/clipboard.js';
import { useFormSubmit } from '#lib/forms/useFormSubmit.js';
import * as v from 'valibot';
import { showToast } from '#lib/ui/toast.js';
import { useTranslation } from '#src/hooks/core/index.js';
import { useNormalizedLocation } from '#src/hooks/core/index.js';

interface AdminGroupHeaderProps {
  group: Group;
  photoCount: number;
  onEditSettings: () => void;
  onUpdateTitle: (newName: string) => Promise<void>;
}

/**
 * AdminGroupHeader
 * 
 * 管理員合組詳情頁的首部控制欄，支持標題編輯、分享與批量操作切換。
 */
export function AdminGroupHeader({ group, photoCount, onEditSettings, onUpdateTitle }: AdminGroupHeaderProps) {
  const [, setLocation] = useNormalizedLocation();
  const [copied, setCopied] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(group.name);
  const { t } = useTranslation();
  const { toggleMode } = useSelectionActions();
  const isMultiSelect = useIsMultiSelect();
  const { can } = usePermission();
  const canBatchEdit = can('photo:batch-edit');

  const dynamicSchema = v.object({
    title: v.pipe(v.string(), v.minLength(3, t('titleMinLength') || 'Title too short')),
  });

  const { submit: updateTitle, isLoading: isUpdating } = useFormSubmit<typeof dynamicSchema, boolean>({
    schema: dynamicSchema,
    mutationFn: async ({ title }) => {
      await onUpdateTitle(title);
      return true;
    },
    onSuccess: () => {
      setIsEditingTitle(false);
    },
    successMessage: t('updateTitleSuccess') || 'Title updated',
    errorMessage: t('updateTitleFailed') || 'Update failed'
  });

  const handleCopyId = async () => {
    const success = await copyToClipboard(group.id);
    if (success) {
      showToast.success(t('groupIdCopied') || 'ID copied');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/group/${group.id}`;
    const success = await copyToClipboard(url);
    if (success) {
      showToast.success(t('shareLinkCopied') || 'Share link copied');
    }
  };

  const handleSaveTitle = async () => {
    if (!editTitleValue.trim() || editTitleValue === group.name) {
      setEditTitleValue(group.name);
      setIsEditingTitle(false);
      return;
    }
    await updateTitle({ title: editTitleValue.trim() });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveTitle();
    }
    if (e.key === 'Escape') {
      setEditTitleValue(group.name);
      setIsEditingTitle(false);
    }
  };

  return (
    <div className="glass-header !p-3 sm:!p-4 flex items-center justify-between w-full border-b bg-white/80 backdrop-blur-md">
      {/* Left side: Back button & Title section */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <button 
          onClick={() => setLocation('/admin')}
          className="p-1.5 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
          title={t('backToHome') || 'Back'}
        >
          <Icon name="arrow-left" className="w-5 h-5" />
        </button>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            {isEditingTitle ? (
              <input
                type="text"
                autoFocus
                disabled={isUpdating}
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={handleKeyDown}
                className="text-sm sm:text-base font-bold text-slate-900 bg-slate-50 border border-slate-200 outline-none ring-2 ring-indigo-500/20 rounded-md px-2 py-1 max-w-[150px] sm:max-w-xs transition-all"
                placeholder={t('titlePlaceholder') || 'Enter title...'}
              />
            ) : (
              <h1 
                className="text-sm sm:text-base font-bold text-slate-900 truncate cursor-pointer hover:text-indigo-600 transition-colors"
                onClick={() => {
                  setEditTitleValue(group.name);
                  setIsEditingTitle(true);
                }}
                title={t('clickToEditTitle') || 'Click to edit'}
              >
                {group.name || t('clickToAddTitle') || 'Untitled Group'}
              </h1>
            )}
            
            <button 
              onClick={handleCopyId}
              className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-slate-600 transition-colors shrink-0 rounded bg-slate-50 border border-slate-100 hover:bg-slate-100 active:scale-95"
              title={t('copyGroupId') || 'Copy ID'}
            >
              <span className="font-mono tracking-wider font-medium opacity-80">ID: {group.id.substring(0, 6)}</span>
              {copied ? (
                <Icon name="check" className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
              ) : (
                <Icon name="copy" className="w-2.5 h-2.5 shrink-0" />
              )}
            </button>
          </div>
          
          <div className="flex items-center shrink-0">
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 text-[10px] sm:text-xs font-semibold whitespace-nowrap border border-slate-200/50">
              {photoCount > 0 ? (t('photoCountNum', photoCount) || `${photoCount} Photos`) : (t('noPhotosText') || 'No photos')}
            </span>
          </div>
        </div>
      </div>
      
      {/* Right side: Action buttons */}
      <div className="flex items-center gap-1.5 shrink-0 pl-2">
        <button
          onClick={handleShare}
          className="p-1.5 sm:p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
          title={t('copyShareLink') || 'Share'}
        >
          <Icon name="share-2" className="w-4 h-4" />
        </button>
 
        {canBatchEdit && (
          <button 
            onClick={toggleMode}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs transition-all font-semibold ${
              isMultiSelect 
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/50'
            }`}
          >
            <Icon name={isMultiSelect ? "x" : "check-square"} className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isMultiSelect ? t('cancel') : t('selectAction')}</span>
          </button>
        )}

        <button 
          onClick={onEditSettings} 
          className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/50 rounded-lg text-xs transition-all font-semibold"
        >
          <Icon name="settings" className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('settings') || 'Settings'}</span>
        </button>
      </div>
    </div>
  );
}
