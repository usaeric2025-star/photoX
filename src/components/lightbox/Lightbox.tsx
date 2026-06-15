import { useMemo, useEffect } from 'react';
import { useLightboxState } from './hooks/useLightboxState';
import { LightboxHeader } from './LightboxHeader';
import { LightboxThumbnails } from './LightboxThumbnails';
import { LightboxInfo } from './LightboxInfo';
import { LightboxImage } from './LightboxImage';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { LightboxItem, LightboxMode } from './types';
import { Pin, Edit2, Trash2 } from 'lucide-react';

export interface UnifiedLightboxProps {
  mode: LightboxMode;
  open: boolean;
  items: LightboxItem[];
  initialIndex: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSetCover?: (id: string) => void;
}

export function Lightbox({ 
  mode, 
  open, 
  items, 
  initialIndex, 
  onClose, 
  onIndexChange, 
  onEdit, 
  onDelete, 
  onSetCover 
}: UnifiedLightboxProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { currentIndex, showInfo, goTo, setShowInfo, syncIndex } = useLightboxState(initialIndex, onIndexChange);
  const currentItem = items[currentIndex];
  const isAdmin = mode === 'admin';

  // ✅ 穩定 items 引用
  const stableItems = useMemo(() => items, [items]);

  useEffect(() => {
    if (open) {
      syncIndex(initialIndex);
    }
  }, [open, initialIndex, syncIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) goTo(currentIndex - 1);
      if (e.key === 'ArrowRight' && currentIndex < items.length - 1) goTo(currentIndex + 1);
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentIndex, items.length, goTo, onClose]);

  if (!open || !currentItem) return null;

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col backdrop-blur-sm">
      {/* 頂部欄 */}
      <LightboxHeader
        title={currentItem.title}
        currentIndex={currentIndex}
        total={stableItems.length}
        onClose={onClose}
        onInfo={() => setShowInfo(!showInfo)}
        showInfo={showInfo}
      />

      {/* 主照片區域 */}
      <div className="flex-1 flex items-center justify-center relative touch-none">
        <LightboxImage 
          src={currentItem.src} 
          alt={currentItem.title} 
          className="max-h-[calc(100vh-120px)] max-w-[100vw] sm:max-w-[90vw] object-contain transition-transform duration-300" 
        />

        {/* 導航區域（點擊左右側切換） */}
        {currentIndex > 0 && (
          <button 
            onClick={() => goTo(currentIndex - 1)} 
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-3 text-white/50 hover:text-white bg-black/20 hover:bg-black/50 rounded-full backdrop-blur-md transition-all z-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
        )}
        {currentIndex < stableItems.length - 1 && (
          <button 
            onClick={() => goTo(currentIndex + 1)} 
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-3 text-white/50 hover:text-white bg-black/20 hover:bg-black/50 rounded-full backdrop-blur-md transition-all z-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        )}
      </div>

      {/* 縮圖軌道 */}
      <LightboxThumbnails items={stableItems} currentIndex={currentIndex} onSelect={goTo} />

      {/* 資訊卡 */}
      <LightboxInfo
        item={currentItem}
        show={showInfo}
        onClose={() => setShowInfo(false)}
        onEdit={isAdmin && onEdit ? () => onEdit(currentItem.id) : undefined}
        isMobile={isMobile}
      />

      {/* 管理模式底部控制欄（管理按鈕） */}
      {isAdmin && (onEdit || onDelete || onSetCover) && (
        <div className="absolute bottom-28 sm:bottom-32 left-0 right-0 flex justify-center gap-2 sm:gap-4 z-20 pointer-events-none">
          <div className="flex gap-2 p-1.5 bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl pointer-events-auto">
            {onSetCover && (
              <button 
                onClick={() => onSetCover(currentItem.id)} 
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 hover:bg-white/10 rounded-xl text-white text-xs sm:text-sm font-medium transition-colors"
              >
                <Pin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">設為封面</span>
              </button>
            )}
            {onEdit && (
              <button 
                onClick={() => {
                  setShowInfo(false);
                  onEdit(currentItem.id);
                }} 
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 hover:bg-white/10 rounded-xl text-white text-xs sm:text-sm font-medium transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">編輯</span>
              </button>
            )}
            {onDelete && (
              <button 
                onClick={() => onDelete(currentItem.id)} 
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl text-xs sm:text-sm font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">刪除</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
