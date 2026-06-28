import React, { useState } from 'react';
import { useAppRouter } from '@/lib/router';
import { Group } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { useSelection } from '@/features/selection';
import { useSignal } from '@/lib/store';
import { copyToClipboard } from '@/utils/clipboard';
import { useFormSubmit } from '@/lib/forms/useFormSubmit';
import { FormProvider, useFormField } from '@/lib/forms/useFormField';
import * as v from 'valibot';
import { Input } from '@/components/shared/Input';
import { showToast } from '@/lib/ui/toast';

const GroupTitleSchema = v.object({
  title: v.pipe(v.string(), v.minLength(3, '標題至少需要3個字元')),
});

interface TitleInputProps {
  value: string;
  onChange: (val: string) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  disabled: boolean;
}

function TitleInput({ value, onChange, onBlur, onKeyDown, disabled }: TitleInputProps) {
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
      placeholder="請輸入大於2個字元的名稱"
    />
  );
}

interface GroupHeaderProps {
  group: Group;
  photoCount: number;
  isAdmin: boolean;
  onEditSettings?: () => void;
  onUpdateTitle?: (newName: string) => Promise<void>;
}

export function GroupHeader({ group, photoCount, isAdmin, onEditSettings, onUpdateTitle }: GroupHeaderProps) {
  const { navigate } = useAppRouter();
  const [copied, setCopied] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(group.name);
  
  const { toggleMode, isMultiSelect } = useSelection();

  const { submit: updateTitle, isLoading: isUpdating, fieldErrors, clearFieldError } = useFormSubmit<typeof GroupTitleSchema, boolean>({
    schema: GroupTitleSchema,
    mutationFn: async ({ title }) => {
      if (onUpdateTitle) {
        await onUpdateTitle(title);
        return true;
      }
      return false;
    },
    onSuccess: () => {
      setIsEditingTitle(false);
    },
    successMessage: '更新標題成功',
    errorMessage: '更新標題失敗'
  });

  const handleCopyId = async () => {
    const success = await copyToClipboard(group.id);
    if (success) {
      showToast.success('合組 ID 已複製');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/group/${group.id}`;
    const success = await copyToClipboard(url);
    if (success) {
      showToast.success('分享連結已複製');
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
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2 mb-1">
          {isAdmin && isEditingTitle ? (
            <FormProvider fieldErrors={fieldErrors} clearFieldError={clearFieldError}>
              <TitleInput
                disabled={isUpdating}
                value={editTitleValue}
                onChange={setEditTitleValue}
                onBlur={handleSaveTitle}
                onKeyDown={handleKeyDown}
              />
            </FormProvider>
          ) : (
            <h1 
              className={`text-xl font-bold text-slate-900 truncate ${isAdmin ? 'cursor-pointer hover:underline decoration-slate-300 underline-offset-4' : ''}`}
              onClick={() => isAdmin && setIsEditingTitle(true)}
              title={isAdmin ? "點擊編輯標題" : (group.name || '未命名合組')}
            >
              {group.name || (isAdmin ? '點擊新增標題...' : '未命名合組')}
            </h1>
          )}
          
          <button 
            onClick={handleCopyId}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors shrink-0 rounded hover:bg-slate-100"
            title="複製組ID"
          >
            {copied ? <Icon name="check" className="w-3.5 h-3.5" /> : <Icon name="copy" className="w-3.5 h-3.5" />}
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold whitespace-nowrap border border-indigo-100">
            {photoCount > 0 ? `${photoCount} 張照片` : '無照片'}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        <button 
          onClick={handleShare}
          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
          title="複製分享連結"
        >
          <Icon name="share" className="w-4 h-4" />
        </button>

        {isAdmin && (
          <>
            <button 
              onClick={toggleMode}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors font-medium ${isMultiSelect ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-transparent'}`}
            >
              {isMultiSelect ? '取消' : '選擇'}
            </button>
            <button onClick={onEditSettings} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-sm transition-colors font-medium">
              <Icon name="edit" className="w-4 h-4" />
              <span className="hidden sm:inline">設定</span>
            </button>
          </>
        )}
        
        <button 
          onClick={() => isAdmin ? navigate.admin() : navigate.home()}
          className="p-2 -mr-2 text-slate-500 hover:text-slate-800 transition-colors ml-1"
          title="返回首頁"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    </div>
  );
}
