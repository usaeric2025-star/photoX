import React from 'react';
import { Category } from '../../types';
import { X } from 'lucide-react';
import { useGalleryStore } from '../../store';

interface CategoriesSectionProps {
  categories: Category[];
  deleteCategory?: (id: string) => void;
  cardClass: string;
}

export const CategoriesSection: React.FC<CategoriesSectionProps> = ({ categories, deleteCategory, cardClass }) => {
  const { setAlertDialog } = useGalleryStore();

  return (
    <section className={cardClass} id="section-categories">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-blue-500 rounded-full"></div>
            分类 / Categories
        </h3>
        <span className="text-[10px] text-brand-navy/40 font-black uppercase">{categories.length} 个项目</span>
      </div>
      
      <div className="flex flex-wrap gap-2 p-3 bg-brand-navy/5 rounded-[28px] border border-brand-navy/10 shadow-inner min-h-[48px]">
        {categories.map(cat => (
          <div key={cat.id} className="bg-white border border-brand-navy/10 pl-4 py-1.5 pr-1.5 rounded-full flex items-center gap-2 shadow-sm group">
            <span className="text-[11px] font-black text-brand-navy uppercase tracking-tight">
               {cat.name}
            </span>
            {deleteCategory && (
               <button 
                  onClick={() => {
                     setAlertDialog({
                        title: '确认删除',
                        message: `确定要删除分类「${cat.name}」吗？此操作不可恢复。`,
                        confirmLabel: '删除',
                        cancelLabel: '取消',
                        type: 'danger',
                        onConfirm: () => deleteCategory(cat.id)
                     });
                  }}
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 hover:bg-red-100 hover:text-red-500 text-slate-400 transition-colors opacity-0 group-hover:opacity-100"
               >
                 <X size={12} strokeWidth={3} />
               </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
