import React, { useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import Download from 'yet-another-react-lightbox/plugins/download';
import { useTranslation } from '@/hooks';
import { Modal } from '@/components/ui/Modal';
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
    photo?: any; // Raw database photo object
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
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const { lang, uiTranslations: t } = useTranslation();

  const slides = items.map((item) => ({
    src: item.src,
    title: item.title,
    description: item.description,
    thumbnail: item.thumbnail,
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
    <>
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
            const filename = typeof slide.title === 'string' ? slide.title : 'photo';
            
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
          ...({
            slideTitle: () => null, // 禁用預設的置中 title 顯示
            slideDescription: () => null, // 禁用預設的置中 description 顯示
          } as any),
          controls: () => {
            if (!showCaption || !currentItem) return null;
            return (
              <div 
                onClick={() => setIsDetailModalOpen(true)}
                className="absolute right-4 bottom-[90px] md:bottom-[96px] z-[99999] max-w-[260px] bg-slate-950/85 hover:bg-slate-950/95 border border-slate-800 backdrop-blur-md text-white rounded-2xl shadow-2xl p-4 select-none flex flex-col gap-1.5 cursor-pointer transition-all hover:scale-[1.03] active:scale-[0.98] duration-200 text-left pointer-events-auto border-brand-gold/15"
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  {currentItem.category && (
                    <span className="bg-brand-gold text-slate-950 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                      {currentItem.category}
                    </span>
                  )}
                  {currentItem.photo?.item_code && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {currentItem.photo.item_code}
                    </span>
                  )}
                </div>
                
                <div className="text-[13px] font-bold text-slate-100 truncate line-clamp-1 block leading-tight">
                  {currentItem.title}
                </div>

                <div className="text-[10px] text-brand-gold font-medium mt-1 select-none flex items-center gap-1 opacity-90">
                  <span>ℹ️</span> 點擊查看完整資料
                </div>
              </div>
            );
          }
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
      <Modal
        open={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={currentItem?.title || t.furnitureRecord}
        size="md"
        className="text-slate-800"
      >
        <div className="flex flex-col gap-4">
          {/* 頂部縮圖預覽卡 */}
          <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <img 
              src={currentItem?.thumbnail || currentItem?.src} 
              alt={currentItem?.title}
              className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0" 
              referrerPolicy="no-referrer"
            />
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-mono">{t.sysCode}: {currentItem?.photo?.item_code || '-'}</span>
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
                {currentItem.photo.dimensions.map((dim: any, idx: number) => {
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
      </Modal>
    </>
  );
}
