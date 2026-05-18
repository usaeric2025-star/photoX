import React from 'react';
import { Category } from '../../types';
import { X } from 'lucide-react';
import { useGalleryStore } from '../../store';

interface CategoriesSectionProps {
  categories: Category[];
  deleteCategory?: (id: string) => void;
  updateCategory?: (id: string, data: Partial<Category>) => void;
  addCategory?: (name: string) => void;
  cardClass: string;
}

export const CategoriesSection: React.FC<CategoriesSectionProps> = ({ 
  categories, deleteCategory, updateCategory, addCategory, cardClass 
}) => {
  const { setAlertDialog, setPromptDialog } = useGalleryStore();
  const [newCatName, setNewCatName] = React.useState('');

  const handleAdd = () => {
    if (!newCatName.trim() || !addCategory) return;
    addCategory(newCatName.trim());
    setNewCatName('');
  };

  return (
    <section className={cardClass} id="section-categories">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-blue-500 rounded-full"></div>
            分类列表 / Category List
        </h3>
        <span className="text-[10px] text-brand-navy/40 font-black uppercase">{categories.length} Items</span>
      </div>
      
      <div className="flex flex-wrap gap-2 p-3 bg-brand-navy/5 rounded-[28px] border border-brand-navy/10 shadow-inner min-h-[48px]">
        {categories.map(cat => (
          <div key={cat.id} className="bg-white border border-brand-navy/10 pl-4 py-1.5 pr-4 rounded-full flex items-center gap-2 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[11px] font-black text-brand-navy uppercase tracking-tight">
                 {cat.zh || cat.name}
              </span>
              <span className="text-[9px] font-bold text-brand-navy/30 uppercase tracking-tighter">
                 {cat.en || 'No English Name'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
