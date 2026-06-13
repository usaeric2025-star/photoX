import React from 'react';
import { Plus, Settings2, Sparkles, FolderMinus } from 'lucide-react';
import { Photo } from '@/types';

interface GroupAdminBottomBarProps {
  appLang: string;
  isMultiSelect: boolean;
  onAddPhotos: () => void;
  onSettingsClick: () => void;
  onAiAnalyze: () => void;
  onDissolve: () => void;
}

export function GroupAdminBottomBar({
  appLang,
  isMultiSelect,
  onAddPhotos,
  onSettingsClick,
  onAiAnalyze,
  onDissolve
}: GroupAdminBottomBarProps) {
  if (isMultiSelect) return null;

  return (
    <div className="flex-shrink-0 bg-white border-t border-slate-100 px-4 py-3 flex items-center justify-around pb-safe-offset-2">
      {/* 1. Add Photos button */}
      <button
        type="button"
        onClick={onAddPhotos}
        className="flex flex-col items-center gap-1 text-[9px] font-black uppercase tracking-tight text-slate-500 hover:text-emerald-600 transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 mb-1 hover:bg-emerald-50 transition-colors">
          <Plus size={18} className="text-emerald-500" />
        </div>
        <span>{appLang === 'zh' ? '添加' : 'Add'}</span>
      </button>

      {/* 2. Group Settings button */}
      <button
        type="button"
        onClick={onSettingsClick}
        className="flex flex-col items-center gap-1 text-[9px] font-black uppercase tracking-tight text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 mb-1 hover:bg-indigo-50 transition-colors">
          <Settings2 size={18} className="text-indigo-500" />
        </div>
        <span>{appLang === 'zh' ? '编辑' : 'Edit'}</span>
      </button>

      {/* 3. AI Analyze button */}
      <button
        type="button"
        onClick={onAiAnalyze}
        className="flex flex-col items-center gap-1 text-[9px] font-black uppercase tracking-tight text-slate-500 hover:text-blue-600 transition-colors relative"
      >
        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 mb-1 hover:bg-blue-50 transition-colors relative overflow-hidden">
          <Sparkles size={18} className="text-blue-500" />
        </div>
        <span>{appLang === 'zh' ? 'AI 识别' : 'AI Identify'}</span>
      </button>

      {/* 4. Dissolve button */}
      <button
        type="button"
        onClick={onDissolve}
        className="flex flex-col items-center gap-1 text-[9px] font-black uppercase tracking-tight text-slate-500 hover:text-red-600 transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 mb-1 hover:bg-red-50 transition-colors">
          <FolderMinus size={18} className="text-red-500" />
        </div>
        <span>{appLang === 'zh' ? '解散' : 'Dissolve'}</span>
      </button>
    </div>
  );
}
