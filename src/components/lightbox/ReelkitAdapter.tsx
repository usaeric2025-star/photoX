import { Dialog } from '@base-ui/react/dialog';
import { LightboxOverlay, type LightboxItem, type ControlsRenderProps, type SlideRenderProps } from '@reelkit/react-lightbox';
import '@reelkit/react-lightbox/styles.css';
import { X, ChevronLeft, ChevronRight, Info, Pencil } from 'lucide-react';
import { OptimizedImage } from '@/components/shared/OptimizedImage';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { ReelApi } from '@reelkit/react';
import { ThumbnailsStrip } from './ThumbnailsStrip';

export interface ReelkitAdapterProps {
  open: boolean;
  items: Array<LightboxItem & { thumbnail?: string; id?: string }>;
  initialIndex?: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDownload?: (id: string) => void;
  onSetCover?: (id: string) => void;
  showSetCover?: boolean;
  renderSidebar?: () => React.ReactNode;
  renderFloatingButton?: () => React.ReactNode;
  totalCount?: number;
  hideClose?: boolean;
  
  // Handled from parent
  showInfo?: boolean;
  onToggleInfo?: (show: boolean) => void;
}

export const ReelkitAdapter = ({
  open,
  items,
  initialIndex = 0,
  onClose,
  onIndexChange,
  onEdit,
  onDelete,
  onDownload,
  onSetCover,
  showSetCover,
  renderSidebar,
  renderFloatingButton,
  totalCount,
  hideClose,
  showInfo,
  onToggleInfo
}: ReelkitAdapterProps) => {
  const activeShowInfo = showInfo ?? false;
  const apiRef = useRef<ReelApi>(null);
  const thumbnailApiRef = useRef<ReelApi>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const lastSyncIndexRef = useRef(initialIndex);

  // 同步內部狀態到父層
  const handleIndexChange = useCallback((index: number) => {
    setCurrentIndex(index);
    lastSyncIndexRef.current = index;
    onIndexChange?.(index);
  }, [onIndexChange]);

  // 當 open 變化時，重置燈箱位置
  useEffect(() => {
    if (open && apiRef.current) {
      if (initialIndex !== lastSyncIndexRef.current) {
        // 外部改變了 index (例如上一頁/下一頁，或剛開啟時的初始跳轉)
        apiRef.current.goTo(initialIndex);
        setCurrentIndex(initialIndex);
        lastSyncIndexRef.current = initialIndex;
      }
    } else if (!open) {
      lastSyncIndexRef.current = initialIndex;
    }
  }, [open, initialIndex]);

  // 當主圖切換時同步縮圖軌道
  useEffect(() => {
    if (thumbnailApiRef.current) {
      thumbnailApiRef.current.goTo(currentIndex);
    }
  }, [currentIndex]);

  if (!open) return null;

  const currentItem = items[currentIndex];

  return (
    <Dialog.Root open={open} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/95 z-[100]" />
        <Dialog.Popup className="fixed inset-0 z-[101]">
          <LightboxOverlay
            isOpen={true} // Controlled by Dialog.Root
            images={items}
            apiRef={apiRef}
            initialIndex={initialIndex}
            onClose={onClose}
            onSlideChange={handleIndexChange}
            renderNavigation={({ onPrev, onNext }) => (
              <>
                {/* Desktop Navigation Arrows */}
                <div className="fixed inset-y-0 left-0 w-24 flex items-center justify-center pointer-events-none hidden sm:flex z-[110]">
                  <button 
                    type="button"
                    onClick={() => apiRef.current?.goTo(currentIndex - 1)} 
                    className="p-4 bg-black/5 hover:bg-black/20 text-white/50 hover:text-white rounded-full transition-all active:scale-95 pointer-events-auto"
                    aria-label="Previous"
                  >
                    <ChevronLeft size={48} strokeWidth={1} />
                  </button>
                </div>
                <div className="fixed inset-y-0 right-0 w-24 flex items-center justify-center pointer-events-none hidden sm:flex z-[110]">
                  <button 
                    type="button"
                    onClick={() => apiRef.current?.goTo(currentIndex + 1)} 
                    className="p-4 bg-black/5 hover:bg-black/20 text-white/50 hover:text-white rounded-full transition-all active:scale-95 pointer-events-auto"
                    aria-label="Next"
                  >
                    <ChevronRight size={48} strokeWidth={1} />
                  </button>
                </div>
              </>
            )}
            renderControls={({ onClose: internalOnClose, count }: ControlsRenderProps) => (
              <>
                <div className="fixed top-6 left-6 z-[110] pointer-events-none">
                  <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 shadow-xl pointer-events-auto">
                    <span className="text-white text-xs font-bold tracking-[0.18em] tabular-nums uppercase opacity-90">
                      {currentIndex + 1} <span className="opacity-30 px-1">/</span> {totalCount || count}
                    </span>
                  </div>
                </div>

                <div className="fixed top-6 right-6 z-[120] pointer-events-auto flex items-center gap-3">
                  {onEdit && (
                    <button 
                      type="button"
                      onClick={() => onEdit(currentItem?.id || String(currentIndex))} 
                      className="w-12 h-12 bg-black/40 hover:bg-black/60 active:scale-90 rounded-full text-white transition-all flex items-center justify-center backdrop-blur-md shadow-2xl border border-white/10"
                      aria-label="Edit"
                      title="編輯"
                    >
                      <Pencil size={20} />
                    </button>
                  )}

                  {!hideClose && (
                    <button 
                      type="button"
                      onClick={() => onClose ? onClose() : internalOnClose()} 
                      className="w-12 h-12 bg-black/40 hover:bg-black/60 active:scale-90 rounded-full text-white transition-all flex items-center justify-center backdrop-blur-md shadow-2xl border border-white/10"
                      aria-label="Close"
                      title="關閉"
                    >
                      <X size={24} />
                    </button>
                  )}
                </div>

                {(onSetCover && showSetCover || onDelete) && (
                  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] pointer-events-auto max-w-[95vw] sm:max-w-xl transition-all duration-300">
                    <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-xl p-1.5 rounded-full border border-white/10 shadow-2xl">
                      {onSetCover && showSetCover && (
                        <button 
                          type="button"
                          onClick={() => onSetCover(currentItem?.id || String(currentIndex))} 
                          className="h-9 px-4 sm:px-5 bg-amber-500/90 hover:bg-amber-500 rounded-full text-white transition-all text-[11px] font-bold uppercase tracking-widest whitespace-nowrap active:scale-95 shadow-md shrink-0"
                        >
                          設為封面
                        </button>
                      )}

                      {onDelete && (
                        <button 
                          type="button"
                          onClick={() => onDelete(currentItem?.id || String(currentIndex))} 
                          className="h-9 w-9 flex items-center justify-center hover:bg-red-500/80 hover:text-white rounded-full text-white/70 transition-all active:scale-95 shrink-0"
                          title="Delete"
                        >
                          <X size={18} className="rotate-45" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <ThumbnailsStrip
                  items={items}
                  currentIndex={currentIndex}
                  onSelect={(idx) => {
                    handleIndexChange(idx);
                    if (apiRef.current) {
                      apiRef.current.goTo(idx);
                    } else {
                      // fallback
                      setTimeout(() => {
                        apiRef.current?.goTo(idx);
                      }, 10);
                    }
                  }}
                  apiRef={thumbnailApiRef}
                />

                {!activeShowInfo && onToggleInfo && (
                  <div className="fixed bottom-6 right-6 z-[120] pointer-events-auto">
                    <button 
                      type="button"
                      onClick={() => onToggleInfo(true)} 
                      className="w-12 h-12 active:scale-90 rounded-full transition-all flex items-center justify-center backdrop-blur-md bg-black/40 hover:bg-black/60 text-white border border-white/10 shadow-2xl"
                      aria-label="Toggle Attributes"
                      title="資訊 & 屬性"
                    >
                      <Info size={22} />
                    </button>
                  </div>
                )}

                {renderSidebar && (
                  <div className="fixed inset-0 pointer-events-none z-[130]">
                    {renderSidebar()}
                  </div>
                )}

                {!activeShowInfo && renderFloatingButton && (
                  <div className="fixed inset-0 pointer-events-none z-[100]">
                    {renderFloatingButton()}
                  </div>
                )}
              </>
            )}
            renderSlide={({ item }: SlideRenderProps) => (
              <div className="h-full w-full flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-500">
                <OptimizedImage 
                  src={item.src || ''} 
                  alt={(item as any).title || ''} 
                  className="max-h-full max-w-full object-contain pointer-events-none select-none shadow-2xl rounded-sm transition-transform duration-500" 
                  eager
                />
              </div>
            )}
          />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
