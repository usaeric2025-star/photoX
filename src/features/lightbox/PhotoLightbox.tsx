import { useState, useEffect, useRef } from "react";
import { LightboxStyled } from "@mshafiqyajid/react-lightbox/styled";
import "@mshafiqyajid/react-lightbox/styles.css";
import { useLightboxPreloader } from './hooks/useLightbox';
import { Icon } from '@/components/ui/Icon';

// ============ 類型定義 ============
export interface PhotoMetadata {
  date?: string;
  resolution?: string;
  size?: number | string;
  tags?: string[];
  description?: string;
  camera?: string;
  lens?: string;
}

export interface LightboxImage {
  id: string;
  src: string;
  alt: string;
  title?: string;
  category?: string;
  categoryPath?: string[];  // 例如: ['風景攝影', '2024年', '山脈']
  metadata?: PhotoMetadata;
}

export interface PhotoLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: LightboxImage[];
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
  onEdit?: (id: string) => void;
  onDownload?: (index: number) => void;
  onShare?: (index: number) => void;
  onDelete?: (id: string) => void;
  onSetCover?: (id: string) => void;
}

// ============ 主組件 ============
export function PhotoLightbox({
  open,
  onOpenChange,
  images,
  currentIndex: externalIndex,
  onIndexChange: externalOnIndexChange,
  onEdit,
  onDownload,
  onShare,
  onDelete,
  onSetCover,
}: PhotoLightboxProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const [infoExpanded, setInfoExpanded] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const index = externalIndex ?? internalIndex;
  useLightboxPreloader(images, index);
  
  const setIndex = externalOnIndexChange ?? setInternalIndex;
  const currentImage = images[index];

  // Sync open state with native browser Top-Layer <dialog>
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    if (open) {
      if (!el.open) {
        try {
          el.showModal();
          document.body.style.overflow = "hidden";
        } catch (e) {
          console.warn("[PhotoLightbox] Failed to execute showModal:", e);
          el.setAttribute("open", "");
        }
      }
    } else {
      if (el.open) {
        try {
          el.close();
        } catch (e) {
          el.removeAttribute("open");
        }
      }
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Handle native ESC cancel in synced state
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onOpenChange(false);
    };

    el.addEventListener("cancel", handleCancel);
    return () => {
      el.removeEventListener("cancel", handleCancel);
    };
  }, [onOpenChange]);

  // ============ 關閉按鈕（右上） ============
  const CloseButton = () => (
    <button
      type="button"
      onClick={() => onOpenChange(false)}
      className="absolute top-4 right-4 p-2.5 rounded-full bg-black/40 hover:bg-black/70 text-white transition-colors cursor-pointer pointer-events-auto backdrop-blur-md"
      aria-label="關閉"
    >
      <Icon name="x" className="w-6 h-6" />
    </button>
  );

  // ============ 標題 + 核心控制操作列（Always On） ============
  const TitleBar = () => {
    if (!currentImage) return null;
    const { title, category, categoryPath, metadata } = currentImage;
    
    const hasMetadata = !!(metadata && (
      metadata.date || 
      metadata.resolution || 
      metadata.size || 
      metadata.camera || 
      metadata.lens || 
      (metadata.tags && metadata.tags.length > 0) ||
      metadata.description
    ));

    return (
      <div className="absolute bottom-6 left-4 right-4 max-w-4xl mx-auto pointer-events-auto">
        <div className="bg-black/60 backdrop-blur-md rounded-2xl p-4 md:p-5 border border-white/10 space-y-4 shadow-2xl">
          {/* Top level: Title, Categorization, and Public actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/5">
            <div className="space-y-1 min-w-0 flex-1">
              <h3 className="text-white text-lg font-semibold tracking-tight truncate">
                {title || "未命名照片"}
              </h3>
              {categoryPath && categoryPath.length > 0 ? (
                <div className="flex items-center gap-1 text-white/50 text-xs">
                  <span>📁</span>
                  {categoryPath.map((seg, i) => (
                    <span key={i}>
                      {i > 0 && <span className="mx-1">›</span>}
                      <span>{seg}</span>
                    </span>
                  ))}
                </div>
              ) : category ? (
                <div className="text-white/50 text-xs flex items-center gap-1">
                  <span>📁</span>
                  <span>{category}</span>
                </div>
              ) : null}
            </div>

            {/* Public Action Icons aligned right */}
            <div className="flex items-center gap-2">
              {hasMetadata && (
                <button
                  type="button"
                  onClick={() => setInfoExpanded(!infoExpanded)}
                  className={`p-2 rounded-xl transition-all cursor-pointer border ${infoExpanded ? 'bg-white/25 border-white/20 text-white' : 'bg-white/10 border-white/5 text-white/80 hover:bg-white/15 hover:text-white'}`}
                  title={infoExpanded ? "隱藏詳細資訊" : "顯示詳細資訊"}
                >
                  <Icon name="info" className="w-4 h-4" />
                </button>
              )}
              {onDownload && (
                <button
                  type="button"
                  onClick={() => onDownload(index)}
                  className="p-2 rounded-xl border border-white/5 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white transition-all cursor-pointer active:scale-95"
                  title="下載"
                >
                  <Icon name="download" className="w-4 h-4" />
                </button>
              )}
              {onShare && (
                <button
                  type="button"
                  onClick={() => onShare(index)}
                  className="p-2 rounded-xl border border-white/5 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white transition-all cursor-pointer active:scale-95"
                  title="分享"
                >
                  <Icon name="share-2" className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(currentImage.src)}
                className="p-2 rounded-xl border border-white/5 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white transition-all cursor-pointer active:scale-95"
                title="複製連結"
              >
                <Icon name="link" className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sub-Card: EXIF & Details panel (collapsible) */}
          {infoExpanded && hasMetadata && metadata && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {/* Core EXIF values */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-white/70 text-xs mt-1">
                {metadata.date && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-white/30 uppercase tracking-widest text-[9px] font-bold">拍攝日期</span>
                    <span className="font-mono text-white/90">{metadata.date}</span>
                  </div>
                )}
                {metadata.camera && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-white/30 uppercase tracking-widest text-[9px] font-bold">相機機型</span>
                    <span className="text-white/90">{metadata.camera}</span>
                  </div>
                )}
                {metadata.resolution && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-white/30 uppercase tracking-widest text-[9px] font-bold">解析度</span>
                    <span className="font-mono text-white/90">{metadata.resolution}</span>
                  </div>
                )}
                {metadata.size && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-white/30 uppercase tracking-widest text-[9px] font-bold">檔案大小</span>
                    <span className="font-mono text-white/90">{metadata.size}</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {metadata.tags && metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {metadata.tags.map((tag) => (
                    <span 
                      key={tag} 
                      className="px-2 py-0.5 rounded-full bg-white/10 text-[11px] text-white/70"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Description */}
              {metadata.description && (
                <p className="text-white/60 text-xs italic pt-2 border-t border-white/5 leading-relaxed">
                  {metadata.description}
                </p>
              )}
            </div>
          )}

          {/* Admin Management Tools (Edit, Set Cover, Delete) aligned left */}
          {(onEdit || onSetCover || onDelete) && (
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/10">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(currentImage.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer active:scale-95"
                >
                  <Icon name="pencil" className="w-3.5 h-3.5" />
                  編輯照片
                </button>
              )}
              {onSetCover && (
                <button
                  type="button"
                  onClick={() => onSetCover(currentImage.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer active:scale-95"
                >
                  <Icon name="check-circle" className="w-3.5 h-3.5" />
                  設為封面
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(currentImage.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-650 hover:bg-red-600 text-white text-xs font-bold transition-all cursor-pointer active:scale-95"
                >
                  <Icon name="trash-2" className="w-3.5 h-3.5" />
                  刪除照片
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============ 渲染 ============
  if (!open) return null;

  return (
    <>
      <dialog
        ref={dialogRef}
        className="m-0 p-0 w-screen h-[100dvh] max-w-none max-h-none border-none bg-transparent outline-none backdrop:bg-transparent overflow-hidden pointer-events-none"
      >
        <div className="relative w-full h-full flex flex-col text-white overflow-hidden pointer-events-none">
          {/* Custom Overlays Overlaying on top within native isolated stacking layer */}
          <div className="absolute inset-0 pointer-events-none">
            <CloseButton />
            <TitleBar />
          </div>
        </div>
      </dialog>
      <LightboxStyled
        images={images.map(img => ({
          src: img.src,
          alt: img.alt,
          caption: img.title || img.alt,
        }))}
        open={open}
        index={index}
        onIndexChange={setIndex}
        onOpenChange={onOpenChange}
        showThumbnails={true}
        showClose={false}
        showCaption={false}
        showCounter={false}
        zoom={true}
        loop={true}
      />
    </>
  );
}
