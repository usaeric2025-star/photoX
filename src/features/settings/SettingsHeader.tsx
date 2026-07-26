import React from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { Button } from '#src/components/ui/Button.js';
import { useSettingsText } from '#src/hooks/useSettingsText.js';

interface SettingsHeaderProps {
  hasChanges: boolean;
  isSaving?: boolean;
  onSave: () => void;
  onClose: () => void;
}

/**
 * SettingsHeader
 * 
 * 设置页面的头部，包含标题、未保存提示、保存按钮与关闭按钮。
 */
export function SettingsHeader({ hasChanges, isSaving, onSave, onClose }: SettingsHeaderProps) {
  const text = useSettingsText();
  
  return (
    <div className="px-6 py-4 flex items-center justify-between bg-white border-b border-slate-200 shrink-0 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center shadow-sm text-white shrink-0">
          <Icon name="settings-2" size={18} className="stroke-[2.5]" />
        </div>
        <span className="font-black text-lg tracking-tight text-slate-800">
          {text.title}
        </span>
        {hasChanges && (
          <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2.5 py-1 rounded-full font-bold uppercase tracking-widest ">
            {text.unsavedChanges}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button 
           id="save-settings-btn"
           onClick={onSave}
           loading={isSaving}
           variant="primary"
           className="h-10 px-4 rounded-full shadow-sm bg-brand-gold hover:bg-brand-gold/90 border-0"
           leftIcon={!isSaving && <Icon name="save" size={16} />}
           title={text.common.save}
        >
          {text.common.save}
        </Button>
        
        <button 
          id="close-settings-btn"
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 shrink-0 border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-100 shadow-sm cursor-pointer outline-none"
          title={text.common.cancel}
        >
          <Icon name="x" size={20} />
        </button>
      </div>
    </div>
  );
}
