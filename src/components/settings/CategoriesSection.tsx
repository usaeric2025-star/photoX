import React from 'react';
import { Category } from '../../types';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
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
  const { setPromptDialog } = useGalleryStore();
  const [newCatName, setNewCatName] = React.useState('');

  const handleAdd = () => {
    if (!newCatName.trim() || !addCategory) return;
    addCategory(newCatName.trim());
    setNewCatName('');
  };

  const handleUpdateCatName = async (cat: Category) => {
    if (!updateCategory) return;
    setPromptDialog({
      title: '编辑分类 / Edit Category',
      message: '输入新名称 / Enter new name:',
      placeholder: cat.name,
      onSubmit: async (newName) => {
        if (newName && newName.trim() !== cat.name) {
          await updateCategory(cat.id, { name: newName.trim() });
        }
      }
    });
  };

  return (
    <section className={cardClass} id="section-categories">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-brand-gold rounded-full"></div>
            分类列表 / Category List
        </h3>
        <span className="text-[10px] text-brand-navy/40 font-black uppercase">{categories.length} Items</span>
      </div>
      
      <div className="flex gap-2 mb-4">
        <input 
          type="text" 
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          placeholder="分类名称 / Category Name"
          className="flex-1 bg-brand-navy/5 border border-brand-navy/10 px-4 py-2 rounded-2xl text-xs outline-none focus:border-brand-gold transition-all"
        />
        <button 
          onClick={handleAdd}
          disabled={!newCatName.trim()}
          className="bg-brand-gold text-white p-2.5 rounded-2xl shadow-sm hover:bg-brand-gold/90 transition-all disabled:opacity-50"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 p-3 bg-brand-navy/5 rounded-[28px] border border-brand-navy/10 shadow-inner min-h-[48px]">
        {categories.map(cat => (
          <div 
            key={cat.id} 
            className="group bg-white border border-brand-navy/10 pl-4 py-1.5 pr-3 rounded-full flex items-center gap-2 shadow-sm transition-all hover:border-brand-gold/30"
          >
            <div className="flex flex-col">
              <span className="text-[11px] font-black text-brand-navy uppercase tracking-tight">
                 {cat.zh || cat.name}
              </span>
              <span className="text-[9px] font-bold text-brand-navy/30 uppercase tracking-tighter">
                 {cat.en || 'No English Name'}
              </span>
            </div>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
              <button 
                onClick={() => handleUpdateCatName(cat)}
                className="p-1 text-blue-500 hover:bg-blue-50 rounded-full"
              >
                <Pencil size={12} />
              </button>
              <button 
                onClick={() => deleteCategory?.(cat.id)}
                className="p-1 text-red-500 hover:bg-red-50 rounded-full"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
