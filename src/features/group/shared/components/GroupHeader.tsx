import React, { useState } from 'react';
import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import { Group } from '@/types';
import { Edit, Share, Copy, Check } from 'lucide-react';
import { showToast } from '@/lib/ui/toast';
import { useUIStore } from '@/store/useUIStore';
import { usePhotoSelection } from '@/hooks/photo/usePhotoSelection';

interface GroupHeaderProps {
  group: Group;
  photoCount: number;
  isAdmin: boolean;
  onEditSettings?: () => void;
  onUpdateTitle?: (newName: string) => Promise<void>;
}

export function GroupHeader({ group, photoCount, isAdmin, onEditSettings, onUpdateTitle }: GroupHeaderProps) {
  const navigate = useRouterSafe().navigate;
  const [copied, setCopied] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(group.name);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const { enable, disable } = usePhotoSelection();
  const isMultiSelect = useUIStore(s => s.isMultiSelect);

  const handleCopyId = () => {
    navigator.clipboard.writeText(group.id);
    setCopied(true);
    showToast.success('合組 ID 已複製');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/group/${group.id}`;
    navigator.clipboard.writeText(url);
    showToast.success('分享連結已複製');
  };

  const handleSaveTitle = async () => {
    if (!editTitleValue.trim() || editTitleValue === group.name) {
      setEditTitleValue(group.name);
      setIsEditingTitle(false);
      return;
    }
    
    if (onUpdateTitle) {
      setIsUpdating(true);
      try {
        await onUpdateTitle(editTitleValue.trim());
      } catch (err) {
        showToast.error('更新標題失敗');
        setEditTitleValue(group.name);
      } finally {
        setIsUpdating(false);
        setIsEditingTitle(false);
      }
    } else {
      setIsEditingTitle(false);
    }
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
            <input
              autoFocus
              disabled={isUpdating}
              value={editTitleValue}
              onChange={(e) => setEditTitleValue(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={handleKeyDown}
              className="text-xl font-bold text-slate-900 bg-slate-100 border-none outline-none rounded px-2 py-0.5 w-full max-w-sm"
              placeholder="名稱"
            />
          ) : (
            <h1 
              className={`text-xl font-bold text-slate-900 truncate ${isAdmin ? 'cursor-pointer hover:underline decoration-slate-300 underline-offset-4' : ''}`}
              onClick={() => isAdmin && setIsEditingTitle(true)}
              title={isAdmin ? "點擊編輯標題" : group.name}
            >
              {group.name}
            </h1>
          )}
          
          <button 
            onClick={handleCopyId}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors shrink-0 rounded hover:bg-slate-100"
            title="複製組ID"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold whitespace-nowrap border border-indigo-100">
            {photoCount > 0 ? `${photoCount} 張照片` : '無照片'}
          </span>
          <span className="text-xs text-slate-400">
            {new Date(group.created_at).toLocaleDateString('zh-TW')}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        <button 
          onClick={handleShare}
          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
          title="複製分享連結"
        >
          <Share className="w-4 h-4" />
        </button>

        {isAdmin && (
          <>
            <button 
              onClick={() => isMultiSelect ? disable() : enable()}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors font-medium ${isMultiSelect ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-transparent'}`}
            >
              {isMultiSelect ? '取消' : '選擇'}
            </button>
            <button onClick={onEditSettings} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-sm transition-colors font-medium">
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">設定</span>
            </button>
          </>
        )}
        
        <button 
          onClick={() => navigate({ to: isAdmin ? '/admin' : '/' })}
          className="p-2 -mr-2 text-slate-500 hover:text-slate-800 transition-colors ml-1"
          title="返回首頁"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    </div>
  );
}
