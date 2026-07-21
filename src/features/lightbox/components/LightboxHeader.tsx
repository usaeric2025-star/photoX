import React from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { feedback } from '#lib/feedback.js';
import { Photo } from '#src/types/photo.js';
import { usePermission, useAdminMode, useTranslation } from '#src/hooks/index.js';

interface LightboxHeaderProps {
  currentPhoto: Photo | { original: Photo };
  currentIndex: number;
  totalPhotos: number;
  showInfo: boolean;
  onToggleInfo: () => void;
  onEdit: (photoData: Photo) => void;
  onClose: () => void;
}

/**
 * LightboxHeader
 * 
 * 燈箱頂部的控制欄，包含計數器、信息開關、編輯與關閉按鈕。
 */
export function LightboxHeader({
  currentPhoto,
  currentIndex,
  totalPhotos,
  showInfo,
  onToggleInfo,
  onEdit,
  onClose
}: LightboxHeaderProps) {
  const { t } = useTranslation();
  const photoData = ('original' in currentPhoto ? currentPhoto.original : currentPhoto) as Photo;
  const descriptionObj = photoData?.description;
  const hasDescription = !!descriptionObj;
  
  const { can } = usePermission();
  const isAdminMode = useAdminMode();
  const canEdit = isAdminMode && can('photo:edit');
  
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const key = photoData.imageUrl || photoData.uri || '';
    if (key) {
      const url = key.startsWith('http') ? key : new URL(key, window.location.origin).toString();
      navigator.clipboard.writeText(url);
      feedback.success(t('imageLinkCopied'));
    }
  };

  return (
    <div className="absolute top-0 inset-x-0 p-4 sm:p-6 flex items-start justify-between z-[150] pointer-events-none">
      {/* Left: Counter */}
      <div className="flex items-center gap-3">
        <div className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-black/80 border border-white/10 flex items-center gap-2 shadow-2xl pointer-events-auto transition-transform">
          <span className="text-xs sm:text-sm font-medium text-white/90 font-mono tracking-wider">
            {String(currentIndex + 1).padStart(2, '0')}
            <span className="text-white/30 mx-1">/</span>
            {String(totalPhotos).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
        {canEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(photoData); }}
            className="h-10 sm:h-11 px-4 sm:px-5 bg-blue-600/20 text-blue-400 active:bg-blue-600 active:text-white rounded-2xl text-[10px] font-black tracking-[0.2em] shadow-2xl transition-all active:scale-95 flex items-center gap-2 border border-blue-500/20 uppercase"
          >
            <Icon name="edit" size={14} />
            <span className="hidden sm:inline">{t('edit')}</span>
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleInfo();
          }}
          className={`h-10 w-10 sm:h-11 sm:w-11 rounded-2xl border flex items-center justify-center transition-all active:scale-90 shadow-2xl relative ${
            showInfo 
              ? 'bg-white text-black border-white' 
              : 'bg-black/80 border-white/10 text-white active:bg-black/60'
          }`}
          title={t('diagnostics')}
        >
          <Icon name="info" className={`h-4 w-4 sm:h-5 sm:w-5 ${hasDescription && !showInfo ? 'text-blue-400' : ''}`} />
          {hasDescription && !showInfo && (
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          )}
        </button>

        <button
          onClick={handleShare}
          className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-black/80 border border-white/10 active:bg-black/60 flex items-center justify-center text-white transition-all active:scale-90 shadow-2xl"
          title={t('copyLink')}
        >
          <Icon name="share-2" className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-black/80 border border-white/10 active:bg-black/60 flex items-center justify-center text-white transition-all active:scale-90 shadow-2xl ml-2"
          title={t('close')}
        >
          <Icon name="x" size={20} />
        </button>
      </div>
    </div>
  );
}
