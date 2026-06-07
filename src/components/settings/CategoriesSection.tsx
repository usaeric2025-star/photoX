import React from 'react';
import { Category } from '../../types';
import { useUIStore } from '@/store/useUIStore';

interface CategoriesSectionProps {
  categories: Category[];
  cardClass: string;
}

export function CategoriesSection({ 
  categories, cardClass 
}: CategoriesSectionProps) {
  const appLang = useUIStore((s) => s.appLang);

  const sortedCategories = [...categories].sort((a, b) => {
    const orderA = a.sort_order !== undefined ? a.sort_order : Number(a.id);
    const orderB = b.sort_order !== undefined ? b.sort_order : Number(b.id);
    return orderA - orderB;
  });

  return (
    <section className={cardClass} id="section-categories">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-brand-gold rounded-full"></div>
            分类列表 / Category List <span className="opacity-40">(只读 / Read-only)</span>
        </h3>
        <span className="text-[10px] text-brand-navy/40 font-black uppercase">{categories.length} Items</span>
      </div>

      <div className="flex flex-wrap gap-2 p-3 bg-brand-navy/5 rounded-[28px] border border-brand-navy/10 shadow-inner min-h-[48px]">
        {sortedCategories.map(cat => {
          const displayName = cat[appLang as keyof Pick<Category, 'zh' | 'en' | 'ms'>] || cat.name || '未命名分类';
          return (
            <div 
              key={cat.id} 
              className="group bg-white border border-brand-navy/10 pl-4 py-1.5 pr-4 rounded-full flex items-center gap-2 shadow-sm"
            >
              <div className="flex flex-col">
                <span className="text-[11px] font-black text-brand-navy uppercase tracking-tight">
                  {displayName}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
