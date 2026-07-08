import React, { useState } from 'react';
import { useAppRouter } from '#lib/router/index.js';
import { Group } from '#src/types/index.js';
import { Icon } from '#src/components/ui/Icon.js';
import { useIsMultiSelect, useSelectionActions, usePermission } from '#src/hooks/index.js';
import { copyToClipboard } from '#src/utils/clipboard.js';
import { useFormSubmit } from '#lib/forms/useFormSubmit.js';
import { FormProvider, useFormField } from '#lib/forms/useFormField.js';
import * as v from 'valibot';
import { Input } from '#src/components/shared/Input.js';
import { showToast } from '#lib/ui/toast.js';
import { useTranslation } from '#src/hooks/core/index.js';
import { TranslationType } from '#src/locales/index.js';

const GroupTitleSchema = v.object({
  title: v.pipe(v.string(), v.minLength(3, 'Title error')),
});

interface TitleInputProps {
  value: string;
  onChange: (val: string) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  disabled: boolean;
  t: (key: string, ...args: unknown[]) => string;
}

function TitleInput({ value, onChange, onBlur, onKeyDown, disabled, t }: TitleInputProps) {
  const { error, onChange: clearError } = useFormField('title');
  
  return (
    <Input
      autoFocus
      disabled={disabled}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        clearError?.();
      }}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      error={error}
      className="text-xl font-bold"
      containerClassName="w-full max-w-sm"
      placeholder={t('titlePlaceholder')}
    />
  );
}

interface AdminGroupHeaderProps {
  group: Group;
  photoCount: number;
  onEditSettings: () => void;
  onUpdateTitle: (newName: string) => Promise<void>;
}

export function AdminGroupHeader({ group, photoCount, onEditSettings, onUpdateTitle }: AdminGroupHeaderProps) {
  const { navigate } = useAppRouter();
  const [copied, setCopied] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(group.name);
  
  const { t } = useTranslation();
  const { toggleMode } = useSelectionActions();
  const isMultiSelect = useIsMultiSelect();
  const { can } = usePermission();
  const canBatchEdit = can('photo:batch-edit');

  // Create a dynamic schema to use translated error messages
  const dynamicSchema = v.object({
    title: v.pipe(v.string(), v.minLength(3, t('titleMinLength'))),
  });

  const { submit: updateTitle, isLoading: isUpdating, fieldErrors, clearFieldError } = useFormSubmit<typeof dynamicSchema, boolean>({
    schema: dynamicSchema,
    mutationFn: async ({ title }) => {
      await onUpdateTitle(title);
      return true;
    },
    onSuccess: () => {
      setIsEditingTitle(false);
    },
    successMessage: t('updateTitleSuccess'),
    errorMessage: t('updateTitleFailed')
  });

  const handleCopyId = async () => {
    const success = await copyToClipboard(group.id);
    if (success) {
      showToast.success(t('groupIdCopied'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/group/${group.id}`;
    const success = await copyToClipboard(url);
    if (success) {
      showToast.success(t('shareLinkCopied'));
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
    <div className="glass-header !p-4">
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2 mb-1">
          {isEditingTitle ? (
            <FormProvider fieldErrors={fieldErrors} clearFieldError={clearFieldError}>
              <TitleInput
                disabled={isUpdating}
                value={editTitleValue}
                onChange={setEditTitleValue}
                onBlur={handleSaveTitle}
                onKeyDown={handleKeyDown}
                t={t}
              />
            </FormProvider>
          ) : (
            <h1 
              className="text-xl font-bold text-slate-900 truncate cursor-pointer hover:underline decoration-slate-300 underline-offset-4"
              onClick={() => setIsEditingTitle(true)}
              title={t('clickToEditTitle')}
            >
              {group.name || t('clickToAddTitle')}
            </h1>
          )}
          
          <button 
            onClick={handleCopyId}
            className="flex items-center gap-1.5 p-1 px-2 text-slate-400 hover:text-slate-700 transition-colors shrink-0 rounded hover:bg-slate-100 group"
            title={t('copyGroupId')}
          >
            <span className="text-xs font-mono tracking-wider">{group.id.substring(0, 4)}</span>
            {copied ? <Icon name="check" className="w-3 h-3 text-emerald-500" /> : <Icon name="copy" className="w-3 h-3 transition-transform group-active:scale-90" />}
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold whitespace-nowrap border border-indigo-100">
            {photoCount > 0 ? t('photoCountNum', photoCount) : t('noPhotosText')}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        <button 
          onClick={handleShare}
          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
          title={t('copyShareLink')}
        >
          <Icon name="share" className="w-4 h-4" />
        </button>

        {canBatchEdit && (
          <button 
            onClick={toggleMode}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all font-medium ${isMultiSelect ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-transparent'}`}
          >
            {isMultiSelect ? t('cancel') : t('selectAction')}
          </button>
        )}
        <button onClick={onEditSettings} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-sm transition-all font-medium">
          <Icon name="edit" className="w-4 h-4" />
          <span className="hidden sm:inline">{t('settings')}</span>
        </button>
        
        <button 
          onClick={() => navigate.admin()}
          className="p-2 -mr-2 text-slate-500 hover:text-slate-800 transition-colors ml-1"
          title={t('backToHome')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    </div>
  );
}
