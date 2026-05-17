import React from 'react';
import { Category } from '../../types';

interface CategoriesSectionProps {
  categories: Category[];
  cardClass: string;
}

export const CategoriesSection: React.FC<CategoriesSectionProps> = ({ categories, cardClass }) => {
  return (
    <section className={cardClass} id="section-categories">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-blue-500 rounded-full"></div>
            分类 / Categories (只读 / Read-only)
        </h3>
        <span className="text-[10px] text-brand-navy/40 font-black uppercase">{categories.length} 个项目</span>
      </div>
      
      <div className="flex flex-wrap gap-2 p-3 bg-brand-navy/5 rounded-[28px] border border-brand-navy/10 shadow-inner min-h-[48px]">
        {categories.map(cat => (
          <div key={cat.id} className="bg-white border border-brand-navy/10 px-4 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
            <span className="text-[11px] font-black text-brand-navy uppercase tracking-tight">
               {cat.name}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};
