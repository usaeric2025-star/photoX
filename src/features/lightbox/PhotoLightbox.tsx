import { useState } from "react";
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

  const index = externalIndex ?? internalIndex;
  useLightboxPreloader(images, index);
  
  const setIndex = externalOnIndexChange ?? setInternalIndex;
  const currentImage = images[index];

  // ============ 關閉按鈕（右上） ============
  const CloseButton = () => (
    <button
      onClick={() => onOpenChange(false)}
      className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
      aria-label="關閉"
    >
      <Icon name="x" className="w-6 h-6" />
    </button>
  );

  // ============ 標題 + 分類（Always On） ============
  const TitleBar = () => {
    if (!currentImage) return null;
    const { title, category, categoryPath } = currentImage;

    return (
      <div key={currentImage?.id} className="absolute bottom-20 left-4 right-16 z-10 transition-all duration-300">
        <div 
          className="group bg-black/40 backdrop-blur-sm rounded-lg px-4 py-3 cursor-pointer hover:bg-black/60 transition-colors"
          onClick={() => setInfoExpanded(!infoExpanded)}
        >
          {/* 標題 + 展開按鈕 */}
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className="text-white text-lg font-semibold truncate">
                  {title}
                </h3>
              )}
              {categoryPath && categoryPath.length > 0 && (
                <div className="flex items-center gap-1 text-white/60 text-sm mt-0.5">
                  <span>📁</span>
                  {categoryPath.map((seg, i) => (
                    <span key={i}>
                      {i > 0 && <span className="mx-1">›</span>}
                      <span>{seg}</span>
                    </span>
                  ))}
                </div>
              )}
              {!categoryPath && category && (
                <div className="text-white/60 text-sm mt-0.5">
                  <span>📁 {category}</span>
                </div>
              )}
            </div>

            {/* 展開/收合按鈕 */}
            <button 
              className="ml-3 p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setInfoExpanded(!infoExpanded);
              }}
            >
              {infoExpanded ? (
                <Icon name="chevron-up" className="w-5 h-5" />
              ) : (
                <Icon name="chevron-down" className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* ============ 展開的資訊卡 ============ */}
          {infoExpanded && currentImage.metadata && (
            <div 
              className="mt-3 pt-3 border-t border-white/10 space-y-2 text-white/80 text-sm"
              onClick={(e) => e.stopPropagation()}
            >
              {/* EXIF 資訊 */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {currentImage.metadata.date && (
                  <div className="flex items-center gap-1.5">
                    <span>📅</span>
                    <span>{currentImage.metadata.date}</span>
                  </div>
                )}
                {currentImage.metadata.camera && (
                  <div className="flex items-center gap-1.5">
                    <span>📷</span>
                    <span>{currentImage.metadata.camera}</span>
                  </div>
                )}
                {currentImage.metadata.resolution && (
                  <div className="flex items-center gap-1.5">
                    <span>📐</span>
                    <span>{currentImage.metadata.resolution}</span>
                  </div>
                )}
                {currentImage.metadata.size && (
                  <div className="flex items-center gap-1.5">
                    <span>📦</span>
                    <span>{currentImage.metadata.size}</span>
                  </div>
                )}
              </div>

              {/* 標籤 */}
              {currentImage.metadata.tags && currentImage.metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {currentImage.metadata.tags.map((tag) => (
                    <span 
                      key={tag} 
                      className="px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/70"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* 描述 */}
              {currentImage.metadata.description && (
                <div className="text-white/60 text-sm italic pt-1 border-t border-white/5">
                  {currentImage.metadata.description}
                </div>
              )}

              {/* 操作按鈕 */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                {onEdit && (
                  <button
                    onClick={() => onEdit(currentImage.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm transition"
                  >
                    <Icon name="pencil" className="w-4 h-4" />
                    編輯
                  </button>
                )}
                {onSetCover && (
                  <button
                    onClick={() => onSetCover(currentImage.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm transition"
                  >
                    <Icon name="check-circle" className="w-4 h-4" />
                    設為封面
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(currentImage.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm transition"
                  >
                    <Icon name="trash-2" className="w-4 h-4" />
                    刪除
                  </button>
                )}
                <button
                  onClick={() => onDownload?.(index)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition"
                >
                  <Icon name="download" className="w-4 h-4" />
                  下載
                </button>
                <button
                  onClick={() => onShare?.(index)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition"
                >
                  <Icon name="share-2" className="w-4 h-4" />
                  分享
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(currentImage.src);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition"
                >
                  <Icon name="copy" className="w-4 h-4" />
                  複製連結
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============ 渲染 ============
  return (
    <div className="fixed inset-0 z-[100] empty:hidden">
      {open && (
        <>
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
            zoom={true}
            loop={true}
          />
          <CloseButton />
          <TitleBar />
        </>
      )}
    </div>
  );
}
