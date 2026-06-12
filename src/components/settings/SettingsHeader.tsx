import { Settings2, Save, X } from 'lucide-react';
import { translations } from '@/locales';

interface SettingsHeaderProps {
  appLang: string;
  hasChanges: boolean;
  onSave: () => void;
  onClose: () => void;
}

export function SettingsHeader({ appLang, hasChanges, onSave, onClose }: SettingsHeaderProps) {
  return (
    <div className="px-6 py-4 flex items-center justify-between bg-white border-b border-slate-200 sticky top-0 z-[var(--z-sticky)] shrink-0 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center shadow-sm text-white shrink-0">
          <Settings2 size={18} className="stroke-[2.5]" />
        </div>
        <span className="font-black text-lg tracking-tight text-slate-800">
          {appLang === 'zh' ? '系统设置' : 'System Settings'}
        </span>
        {hasChanges && (
          <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2.5 py-1 rounded-full font-bold uppercase tracking-widest animate-pulse">
            {appLang === 'zh' ? '有未保存修改' : 'Unsaved Changes'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button 
           onClick={onSave}
           className="h-10 px-4 rounded-full shadow-sm bg-brand-gold hover:bg-brand-gold/90 text-white flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 hover:shadow-md cursor-pointer"
           title={appLang === 'zh' ? '保存设置' : 'Save Settings'}
        >
            <Save size={16} />
            <span>{appLang === 'zh' ? '保存' : 'Save'}</span>
        </button>
        
        <button 
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 shrink-0 border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-100 shadow-sm cursor-pointer"
          title={appLang === 'zh' ? '关闭并返回管理模式' : 'Close and Return'}
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
