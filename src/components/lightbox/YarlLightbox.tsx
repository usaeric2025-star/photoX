import React, { useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import Download from 'yet-another-react-lightbox/plugins/download';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import 'yet-another-react-lightbox/plugins/captions.css';

interface YarlLightboxProps {
  open: boolean;
  items: Array<{ 
    id: string; 
    src: string; 
    thumbnail: string; 
    title: string;
    description?: string;
    category?: string;
    tags?: string[];
  }>;
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  // 管理模式專屬（可選）
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSetCover?: (id: string) => void;
}

export function YarlLightbox({
  open,
  items,
  currentIndex,
  onClose,
  onIndexChange,
  onEdit,
  onDelete,
  onSetCover,
}: YarlLightboxProps) {
  console.log('[YarlLightbox] items:', items);
  const [showCaption, setShowCaption] = useState(true);

  const slides = items.map((item) => ({
    src: item.src,
    title: item.title,
    description: item.description,
    thumbnail: item.thumbnail,
    // Add custom metadata for the caption plugin
    custom: {
      category: item.category,
      tags: item.tags,
    }
  }));

  // 判斷是否為管理模式（有傳入任何管理回調）
  const isAdmin = !!(onEdit || onDelete || onSetCover);
  const currentItem = items[currentIndex];

  // 自定義工具欄按鈕：只留下下載跟關閉跟資訊卡切換
  const toolbarButtons: any[] = [];

  // 如果是管理模式，且有編輯/onEdit 回調，就在頭部添加【編輯】按鈕
  if (isAdmin && onEdit && currentItem) {
    toolbarButtons.push(
      <button
        key="edit-btn"
        type="button"
        onClick={() => onEdit(currentItem.id)}
        className="mr-3 text-[13px] font-medium tracking-wide bg-brand-gold hover:bg-yellow-500 text-slate-900 px-3.5 py-1.5 rounded-lg font-sans cursor-pointer h-9 shadow-md flex items-center gap-1.5 transition-all duration-200"
        title="編輯"
      >
        <span>✏️</span> <span>編輯</span>
      </button>
    );
  }

  // 資訊卡開關按鈕
  toolbarButtons.push(
    <button
      key="info-toggle-btn"
      type="button"
      onClick={() => setShowCaption(!showCaption)}
      className="mr-2 text-[12px] font-medium bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg font-sans cursor-pointer h-9 shadow-sm flex items-center gap-1 transition-all duration-200 hover:scale-105 active:scale-95 shrink-0"
      title="資訊卡開關"
    >
      <span>ℹ️</span> <span>{showCaption ? '隱藏資訊' : '顯示資訊'}</span>
    </button>
  );

  // 下載跟關閉
  toolbarButtons.push('download');
  toolbarButtons.push('close');

  return (
    <Lightbox
      open={open}
      close={onClose}
      index={currentIndex}
      on={{
        view: ({ index }) => onIndexChange(index),
      }}
      slides={slides}
      plugins={[Thumbnails, Captions, Download]}
      thumbnails={{
        position: 'bottom',
        width: 80,
        height: 60,
        gap: 16,
        imageFit: 'cover',
        showToggle: false,
      }}
      captions={{
        showToggle: false,
        descriptionMaxLines: 1,
      }}
      download={{
        download: ({ slide }) => {
          const src = slide.src;
          const filename = slide.title || 'photo';
          
          fetch(src, { mode: 'cors' })
            .then(res => res.blob())
            .then(blob => {
              const blobUrl = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = blobUrl;
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(blobUrl);
            })
            .catch(err => {
              console.warn('CORS download failed, falling back:', err);
              const link = document.createElement('a');
              link.href = src;
              link.target = '_blank';
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            });
        }
      }}
      render={{
        buttonThumbnails: () => null,
        buttonPrev: items.length <= 1 ? () => null : undefined,
        buttonNext: items.length <= 1 ? () => null : undefined,
        caption: showCaption ? ({ slide }) => {
          const custom = (slide as any).custom;
          return (
            <div className="flex flex-col gap-1 max-w-xl mx-auto text-left bg-slate-900/80 p-3.5 rounded-xl border border-slate-800/50 backdrop-blur-md">
              <div className="flex items-center gap-2">
                {custom?.category && (
                  <span className="bg-brand-gold text-slate-950 px-1.5 py-0.5 rounded text-[10px] font-black uppercase">
                    {custom.category}
                  </span>
                )}
                <span className="text-sm font-bold text-white">{slide.title}</span>
              </div>
              {custom?.tags && custom.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {custom.tags.map((tag: string) => (
                    <span key={tag} className="text-[10px] text-slate-300 font-medium">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          );
        } : () => null
      }}
      toolbar={{
        buttons: toolbarButtons,
      }}
      carousel={{
        preload: 2,
        finite: false,
      }}
    />
  );
}

