import React, { useRef } from 'react';
import { Grid, Pencil, Trash2 } from 'lucide-react';
import { createPortal } from "react-dom";
import { toast } from '@/lib/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Tag } from '@/types/photo';
import { cn } from '@/lib/utils';
import { useLongPress } from '@/hooks/useLongPress';
import { getSafeText } from '@/lib/ai/safeText';

interface TagBadgeProps {
  tag: Tag;
  isAdmin: boolean;
  appLang: string;
  onLongPress: (tag: Tag) => void;
}

function TagBadge({ tag, isAdmin, appLang, onLongPress }: TagBadgeProps) {
  const btnRef = useRef<HTMLSpanElement>(null);
  
  useLongPress(btnRef, {
    delay: 600,
    onLongPress: () => isAdmin && onLongPress(tag)
  });

  return (
    <span 
      ref={btnRef}
      className={cn(
        "text-[10.5px] font-semibold text-brand-navy/70 px-2.5 py-1 bg-brand-navy/5 rounded-full border border-brand-navy/10 shadow-sm transition-all active:scale-95 touch-none select-none",
        isAdmin && "cursor-pointer hover:bg-brand-navy/10"
      )}
    >
      #{getSafeText(tag.name, appLang)}
    </span>
  );
}

interface CategoryTagsSectionProps {
  categoryName?: string;
  tags: Tag[];
  isAdmin: boolean;
  appLang: string;
  texts: {
    classification: string;
  };
}

export function CategoryTagsSection({ categoryName, tags, isAdmin, appLang, texts }: CategoryTagsSectionProps) {
  const [activeActionTag, setActiveActionTag] = React.useState<Tag | null>(null);

  if (!categoryName && tags.length === 0) return null;

  return (
    <section>
      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-3">
        <Grid size={12} /> {texts.classification}
      </h4>
      <div className="flex flex-col gap-2">
        {categoryName && (
          <Badge variant="outline" className="bg-brand-navy/5 text-brand-navy border-brand-navy/10 px-2.5 py-1 shadow-sm w-fit">
            <Grid size={12} className="mr-1.5 opacity-60" />
            {categoryName}
          </Badge>
        )}
        <div className="flex flex-wrap gap-2">
          {tags.map((tag: Tag) => (
            <TagBadge 
              key={tag.id} 
              tag={tag} 
              isAdmin={isAdmin}
              appLang={appLang}
              onLongPress={(t) => setActiveActionTag(t)}
            />
          ))}
        </div>
      </div>

      {activeActionTag && createPortal(
        <div
          className="fixed inset-0 z-[var(--z-index-max)] bg-slate-950/40 flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setActiveActionTag(null)}
        >
          <div
            className="glass-morphism rounded-3xl p-8 w-full max-w-[280px] shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200 cursor-default bg-white border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                标签管理 / TAG
              </span>
              <div className="text-lg font-black text-slate-900">
                #{getSafeText(activeActionTag.name, appLang)}
              </div>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 text-blue-600 bg-blue-50/50 backdrop-blur-sm border border-blue-100/50 font-bold py-4 rounded-2xl hover:bg-blue-100 transition-all cursor-pointer shadow-sm shadow-blue-500/5"
                onClick={() => {
                  toast.info(appLang === 'zh' ? '請在設置頁面管理標籤詳情' : 'Please manage tag details in Settings');
                  setActiveActionTag(null);
                }}
              >
                <Pencil size={18} strokeWidth={2.5} /> {appLang === 'zh' ? '管理標籤' : 'Manage Tag'}
              </button>
              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 text-red-600 bg-red-50/50 backdrop-blur-sm border border-red-100/50 font-bold py-4 rounded-2xl hover:bg-red-100 transition-all cursor-pointer shadow-sm shadow-red-500/5"
                onClick={() => {
                  toast.error(appLang === 'zh' ? '請在設置頁面刪除' : 'Delete in Settings');
                  setActiveActionTag(null);
                }}
              >
                <Trash2 size={18} strokeWidth={2.5} /> {appLang === 'zh' ? '刪除標籤' : 'Delete Tag'}
              </button>
            </div>
            <button
              type="button"
              className="w-full text-slate-400 text-[10px] font-black uppercase tracking-tighter pt-2 active:text-slate-600 cursor-pointer"
              onClick={() => setActiveActionTag(null)}
            >
              取消操作 / CANCEL
            </button>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
