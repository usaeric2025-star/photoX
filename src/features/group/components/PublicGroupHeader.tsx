import React, { useState } from 'react';
import { Group } from '#src/types/index.js';
import { Icon } from '#src/components/ui/Icon.js';
import { copyToClipboard } from '#src/utils/clipboard.js';
import { showToast } from '#lib/ui/toast.js';
import { useTranslation } from '#src/hooks/core/index.js';
import { useNormalizedLocation } from '#src/hooks/core/index.js';

interface PublicGroupHeaderProps {
  group: Group;
  photoCount: number;
}

export function PublicGroupHeader({ group, photoCount }: PublicGroupHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [location, setLocation] = useNormalizedLocation();
  const { t } = useTranslation();

  const handleCopyId = async () => {
    const success = await copyToClipboard(group.id);
    if (success) {
      showToast.success(t('groupIdCopied') || 'ID Copied');
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

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-slate-900 truncate">
            {group.name || t('unnamedGroup')}
          </h1>
          <button 
            onClick={handleCopyId}
            className="flex items-center gap-1.5 p-1 px-2 text-slate-400 hover:text-slate-700 transition-colors shrink-0 rounded hover:bg-slate-100 group"
            title={t('copyGroupId') || 'Copy Group ID'}
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
        
        <button 
          onClick={() => setLocation('/')}
          className="p-2 -mr-2 text-slate-500 hover:text-slate-800 transition-colors ml-1"
          title={t('backToHome')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    </div>
  );
}
