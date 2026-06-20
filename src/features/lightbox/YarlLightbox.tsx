import React, { useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Download from 'yet-another-react-lightbox/plugins/download';
import { useTranslation } from '@/hooks';
import { NativeDialog } from '@/components/ui/NativeDialog';
import { downloadPhotoAsJpeg } from '@/services/photo/downloadService';
import { Edit, Copy } from '@/components/ui/Icon';
import { Photo } from '@/types';
import { showToast } from '@/lib/ui/toast';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';

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
    photo?: Photo; // Raw database photo object
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
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const { lang, uiTranslations: t } = useTranslation();

  const slides = React.useMemo(() => items.map((item) => ({
    src: item.src,
    title: item.title,
    description: item.description,
    thumbnail: item.thumbnail,
    custom: {
      category: item.category,
      tags: item.tags,
    }
  })), [items]);

  // 判斷是否為管理模式（有傳入任何管理回調）
  const isAdmin = !!(onEdit || onDelete || onSetCover);
  const currentItem = items[currentIndex];

  // 自定義工具欄按鈕
  const toolbarButtons: React.ReactNode[] = [];

  // 如果是管理模式，且有編輯/onEdit 回調，就在頭部添加【編輯】按鈕
  if (isAdmin && onEdit && currentItem) {
    toolbarButtons.push(
      <button
        key="edit-btn"
        type="button"
        onClick={() => {
          onEdit(currentItem.id);
        }}
        className="yarl__button flex items-center justify-center cursor-pointer transition-transform duration-150 hover:scale-105"
        title="編輯"
      >
        <Edit strokeWidth={2} className="yarl__icon" />
      </button>
    );
  }

  // 產品資訊（i 按鈕）
  if (currentItem) {
    toolbarButtons.push(
      <button
        key="info-btn"
        type="button"
        onClick={() => setIsDetailDialogOpen(true)}
        className="yarl__button flex items-center justify-center cursor-pointer transition-transform duration-150 hover:scale-105"
        title="產品資訊"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="yarl__icon"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </button>
    );
  }

  // 下載跟關閉
  toolbarButtons.push('download');
  toolbarButtons.push('close');

  return (
    <>
      <Lightbox
        controller={{ focus: false }}
        open={open}
        close={onClose}
        index={currentIndex}
        on={{
          view: ({ index }) => onIndexChange(index),
        }}
        slides={slides}
        plugins={[Thumbnails, Download]}
        thumbnails={{
          position: 'bottom',
          width: 80,
          height: 60,
          gap: 16,
          imageFit: 'cover',
          showToggle: false,
        }}
        download={{
          download: ({ slide }) => {
            const slideAny = slide as any;
            const src = slideAny.src;
            const filename = typeof slideAny.title === 'string' ? slideAny.title : 'photo';
            
            // Route seamlessly through the JPEG converter process with secure proxy
            void downloadPhotoAsJpeg(src, filename);
          }
        }}
        render={{
          buttonThumbnails: () => null,
          buttonPrev: items.length <= 1 ? () => null : undefined,
          buttonNext: items.length <= 1 ? () => null : undefined,
          ...({
            slideTitle: () => null, // 禁用預設的置中 title 顯示
            slideDescription: () => null, // 禁用預設的置中 description 顯示
          } as any),
          controls: () => null
        }}
        toolbar={{
          buttons: toolbarButtons,
        }}
        carousel={{
          preload: 2,
          finite: false,
        }}
      />

      {/* 完整版的資訊卡彈窗 */}
      <NativeDialog
        open={isDetailDialogOpen}
        onClose={() => setIsDetailDialogOpen(false)}
        title={currentItem?.title || t.furnitureRecord}
        size="md"
        className="text-slate-800"
      >
        <div className="flex flex-col gap-4">
          {/* 頂部縮圖預覽卡 */}
          <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
            {(currentItem?.thumbnail || currentItem?.src) ? (
              <img 
                src={currentItem?.thumbnail || currentItem?.src} 
                alt={currentItem?.title}
                className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0" 
                referrerPolicy="no-referrer"
              />
            ) : null}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">{t.sysCode}: {currentItem?.photo?.item_code || '-'}</span>
                {currentItem?.photo?.id && (
                  <button 
                    onClick={() => {
                      if (currentItem.photo?.id) {
                        navigator.clipboard.writeText(currentItem.photo.id);
                        showToast.success('UUID 已复制');
                      }
                    }}
                    className="flex items-center gap-1 text-[10px] text-slate-500 font-mono px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 transition-colors rounded-md active:scale-95 cursor-pointer"
                    title="按此复制完整 ID"
                  >
                    <span>UUID: {currentItem.photo.id.slice(0, 8)}...</span>
                    <Copy className="w-2.5 h-2.5 opacity-60" />
                  </button>
                )}
              </div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">{currentItem?.title}</h3>
              {currentItem?.category && (
                <span className="text-xs text-slate-500 mt-0.5">{t.category}: {currentItem.category}</span>
              )}
            </div>
          </div>

          {/* 規格詳細資料網格 */}
          <div className="grid grid-cols-2 gap-3">
            {currentItem?.photo?.model_number && (
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t.model}</span>
                <span className="text-xs font-semibold text-slate-700 font-mono">{currentItem.photo.model_number}</span>
              </div>
            )}
            {currentItem?.photo?.manual_code && (
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t.manualId || '編號'}</span>
                <span className="text-xs font-semibold text-slate-700 font-mono">{currentItem.photo.manual_code}</span>
              </div>
            )}
            {currentItem?.photo?.price && (
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex flex-col col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t.price}</span>
                <span className="text-sm font-bold text-emerald-600 font-mono">{currentItem.photo.price}</span>
              </div>
            )}
          </div>

          {/* 多語系介紹說明 */}
          {currentItem?.description && (
            <div className="flex flex-col gap-1 bg-slate-50/30 p-3 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.description}</span>
              <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed mt-1">
                {currentItem.description}
              </p>
            </div>
          )}

          {/* 產品尺寸規格列表 */}
          {currentItem?.photo?.dimensions && currentItem.photo.dimensions.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">{t.dimensionsTitle}</span>
              <div className="flex flex-col gap-2">
                {currentItem.photo.dimensions.map((dim: { length?: string | number | null; width?: string | number | null; height?: string | number | null; unit?: string | null; label?: string | null }, idx: number) => {
                  const parts = [
                    dim.length ? `${t.length}: ${dim.length}${dim.unit || 'cm'}` : null,
                    dim.width ? `${t.width}: ${dim.width}${dim.unit || 'cm'}` : null,
                    dim.height ? `${t.height}: ${dim.height}${dim.unit || 'cm'}` : null,
                  ].filter(Boolean);

                  return (
                    <div key={idx} className="bg-slate-50/80 border border-slate-100 p-3 rounded-xl flex flex-col gap-1 text-[13px]">
                      {dim.label && (
                        <span className="font-bold text-slate-700 block text-xs">
                          {dim.label}
                        </span>
                      )}
                      <span className="text-slate-600 font-mono font-medium">
                        {parts.join('  ×  ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 關聯標籤 */}
          {currentItem?.tags && currentItem.tags.length > 0 && (
            <div className="flex flex-col gap-1.5 px-1 mt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.tags}</span>
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                {currentItem.tags.map((tag: string) => (
                  <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </NativeDialog>
    </>
  );
}
