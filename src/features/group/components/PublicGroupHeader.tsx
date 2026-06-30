import React, { useState } from 'react';
import { useAppRouter } from '@/lib/router';
import { Group } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { copyToClipboard } from '@/utils/clipboard';
import { showToast } from '@/lib/ui/toast';
import { useTranslation } from '@/hooks/core/useTranslation';

interface PublicGroupHeaderProps {
  group: Group;
  photoCount: number;
}

export function PublicGroupHeader({ group, photoCount }: PublicGroupHeaderProps) {
  const { navigate } = useAppRouter();
  const { uiTranslations: t } = useTranslation();

  const handleShare = async () => {
    const url = `${window.location.origin}/group/${group.id}`;
    const success = await copyToClipboard(url);
    if (success) {
      showToast.success(t.shareLinkCopied);
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-slate-900 truncate">
            {group.name || t.unnamedGroup}
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold whitespace-nowrap border border-indigo-100">
            {photoCount > 0 ? t.photoCountNum(photoCount) : t.noPhotosText}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        <button 
          onClick={handleShare}
          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
          title={t.copyShareLink}
        >
          <Icon name="share" className="w-4 h-4" />
        </button>
        
        <button 
          onClick={() => navigate.home()}
          className="p-2 -mr-2 text-slate-500 hover:text-slate-800 transition-colors ml-1"
          title={t.backToHome}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    </div>
  );
}
