import React, { useState } from 'react';
import { Group } from '#src/types/index.js';
import { Icon } from '#src/components/ui/Icon.js';
import { useIsMultiSelect, useSelectionActions, usePermission } from '#src/hooks/index.js';
import { copyToClipboard } from '#src/utils/clipboard.js';
import { useFormSubmit } from '#lib/forms/useFormSubmit.js';
import * as v from 'valibot';
import { feedback } from '#lib/feedback.js';
import { useTranslation } from '#src/hooks/core/index.js';
import { useAppLocation } from '#src/hooks/core/index.js';

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
  const [, setLocation] = useAppLocation();
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
      feedback.success(t('groupIdCopied') || 'ID copied');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/group/${group.id}`;
    const success = await copyToClipboard(url);
    if (success) {
      feedback.success(t('shareLinkCopied') || 'Share link copied');
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
    <div className="glass-header px-4 py-3 flex items-center justify-between w-full border-b bg-white/95 relative">
      {/* Left side: Back button & Title section */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <button 
          onClick={() => setLocation('/admin')}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all shrink-0 active:scale-90"
          title={t('backToHome') || 'Back'}
        >
          <Icon name="arrow-left" className="w-5 h-5" />
        </button>
        
        <div className="flex flex-col min-w-0">
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
                className="text-lg font-bold text-slate-900 bg-white border border-indigo-200 outline-none ring-4 ring-indigo-500/10 rounded-xl px-3 py-1 w-full max-w-md transition-all shadow-sm"
                placeholder={t('titlePlaceholder') || 'Enter title...'}
              />
            ) : (
              <h1 
                className="text-lg font-bold text-slate-900 truncate cursor-pointer hover:text-indigo-600 transition-colors py-0.5"
                onClick={() => {
                  setEditTitleValue(group.name);
                  setIsEditingTitle(true);
                }}
                title={t('clickToEditTitle') || 'Click to edit'}
              >
                {group.name || t('clickToAddTitle') || 'Untitled Group'}
              </h1>
            )}
          </div>
          
          <div className="flex items-center gap-3 mt-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold tracking-wider uppercase border border-indigo-100">
              {photoCount} {t('photos') || 'PHOTOS'}
            </span>
            
            <button 
              onClick={handleCopyId}
              className="group flex items-center gap-1.5 px-2 py-0.5 text-[10px] text-slate-400 hover:text-slate-600 transition-colors shrink-0 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100"
              title={t('copyGroupId') || 'Copy ID'}
            >
              <span className="font-mono opacity-80">ID: {group.id.substring(0, 8)}</span>
              {copied ? (
                <Icon name="check" className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
              ) : (
                <Icon name="copy" className="w-2.5 h-2.5 shrink-0" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Right side: Action buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 mr-1 pr-1 sm:mr-2 sm:pr-2 border-r border-slate-200">
           <button
            onClick={handleShare}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100 active:scale-95"
            title={t('copyShareLink') || 'Share'}
          >
            <Icon name="share-2" className="w-5 h-5" />
          </button>
        </div>
 
        {canBatchEdit && (
          <button 
            onClick={toggleMode}
            className={`inline-flex items-center gap-2 h-10 px-4 rounded-xl text-xs transition-all font-bold shadow-sm ${
              isMultiSelect 
                ? 'bg-indigo-600 text-white shadow-indigo-200 ring-2 ring-indigo-500 ring-offset-2' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 active:scale-95'
            }`}
          >
            <Icon name={isMultiSelect ? "x" : "check-square"} className="w-4 h-4" />
            <span className="hidden md:inline">{isMultiSelect ? t('cancel') : t('selectAction')}</span>
          </button>
        )}

        <button 
          onClick={onEditSettings} 
          className="inline-flex items-center justify-center w-10 h-10 sm:w-auto sm:h-10 sm:px-4 bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs transition-all font-bold shadow-sm active:scale-95"
          title={t('settings') || 'Settings'}
        >
          <Icon name="settings" className="w-4 h-4" />
          <span className="hidden sm:inline ml-2">{t('settings') || 'Settings'}</span>
        </button>
      </div>
    </div>
  );
}
