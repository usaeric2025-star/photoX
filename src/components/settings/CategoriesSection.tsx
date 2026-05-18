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
      <div className="flex items-center justify-between">
        <h3 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-blue-500 rounded-full"></div>
            分类设定 / Case Categories
        </h3>
        <span className="text-[10px] text-brand-navy/40 font-black uppercase">{categories.length} Items</span>
      </div>

      <div className="flex gap-2">
        <input 
          type="text" 
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          placeholder="新分类名称 / New category..."
          className="flex-1 bg-brand-navy/5 border border-brand-navy/10 p-2.5 rounded-xl text-xs outline-none focus:border-brand-gold focus:bg-white shadow-inner"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button 
          onClick={handleAdd}
          className="px-4 py-2.5 bg-brand-navy text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm"
        >
          Add
        </button>
      </div>
      
      <div className="flex flex-wrap gap-2 p-3 bg-brand-navy/5 rounded-[28px] border border-brand-navy/10 shadow-inner min-h-[48px]">
        {categories.map(cat => (
          <div key={cat.id} className="bg-white border border-brand-navy/10 pl-4 py-1.5 pr-1.5 rounded-full flex items-center gap-2 shadow-sm group">
            <div className="flex flex-col">
              <span 
                className="text-[11px] font-black text-brand-navy uppercase tracking-tight cursor-pointer hover:text-brand-gold transition-colors"
                onClick={() => {
                  if (!updateCategory) return;
                  setPromptDialog({
                    title: '编辑名称 (ZH) / Edit Name (ZH)',
                    message: '输入新的中文名称 / Enter new Chinese name:',
                    placeholder: cat.zh || cat.name,
                    onSubmit: (name) => name && updateCategory(cat.id, { zh: name.trim(), name: name.trim() })
                  });
                }}
              >
                 {cat.zh || cat.name}
              </span>
              <span 
                className="text-[9px] font-bold text-brand-navy/30 uppercase tracking-tighter cursor-pointer hover:text-brand-gold transition-colors"
                onClick={() => {
                  if (!updateCategory) return;
                  setPromptDialog({
                    title: '编辑名称 (EN) / Edit Name (EN)',
                    message: '输入新的英文名称 / Enter new English name:',
                    placeholder: cat.en || '',
                    onSubmit: (name) => name !== undefined && updateCategory(cat.id, { en: name.trim() })
                  });
                }}
              >
                 {cat.en || 'No English Name'}
              </span>
            </div>
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
