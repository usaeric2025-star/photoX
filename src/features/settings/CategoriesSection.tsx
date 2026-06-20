import React, { useState } from 'react';
import { Plus, Pencil, Trash2 } from '@/components/ui/Icon';
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { useClickOutside } from '@/hooks/core/useClickOutside';
import { PromptDialog } from "@/components/ui/PromptDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useLongPress } from "@/hooks/core/useLongPress";
import { Category } from '../../types';
import { useUIStore } from '@/store/useUIStore';

interface CategoriesSectionProps {
  categories: Category[];
  addCategory: (name: string) => Promise<Category>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<boolean>;
  deleteCategory: (id: string) => void;
  cardClass: string;
  buttonStyles: { [key in "primary" | "secondary" | "accent"]: string };
}

function CategoryItem({
  cat,
  onUpdate,
  onDelete
}: {
  cat: Category;
  onUpdate: (cat: Category) => void;
  onDelete: (id: string | number) => void;
}) {
  const [activeMenuId, setActiveMenuId] = useState<string | number | null>(null);
  const [isEditOpen, editDialog] = useDisclosure(false);
  const [isDeleteOpen, deleteDialog] = useDisclosure(false);
  const appLang = useUIStore((s) => s.appLang);

  const menuRef = useClickOutside(() => {
    if (activeMenuId === cat.id) setActiveMenuId(null);
  });

  useLongPress(menuRef as any, {
    delay: 400,
    onLongPress: () => {
      setActiveMenuId(cat.id);
    }
  });

  let displayName = '未命名分类';
  if (cat.name && typeof cat.name === 'object') {
    displayName = (cat.name as any)[appLang] || (cat.name as any).zh || '未命名分类';
  } else if (cat.name) {
    displayName = String(cat.name);
  }

  return (
      <div
      ref={menuRef as any}
      className={`bg-white border border-brand-navy/10 pl-3 pr-2 py-1 rounded-full flex items-center gap-2 shadow-sm transition-all active:scale-95 relative ${activeMenuId === cat.id ? "bg-brand-gold/10 border-brand-gold/30 scale-95" : ""}`}
    >
      <div className="flex flex-col">
        <span className="text-[11px] font-black text-brand-navy uppercase tracking-tight select-none">
          {displayName}
        </span>
      </div>

      {activeMenuId === cat.id && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-brand-navy rounded-xl shadow-xl p-1 flex flex-col gap-0.5 z-[var(--z-dropdown)] min-w-[120px] animate-scale-in">
            <button
              onClick={(e) => {
                e.stopPropagation();
                editDialog.open();
                setActiveMenuId(null);
              }}
              className="px-3 py-2 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-lg flex items-center gap-2"
            >
              <Pencil size={12} /> 编辑名称
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteDialog.open();
                setActiveMenuId(null);
              }}
              className="px-3 py-2 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-lg flex items-center gap-2"
            >
              <Trash2 size={12} /> 删除
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-brand-navy rotate-45 -mt-1" />
          </div>
        )}

      <PromptDialog
        open={isEditOpen}
        onOpenChange={editDialog.toggle}
        title="编辑分类名称 / Edit Category"
        description="输入新的名称 / Enter new name:"
        defaultValue={displayName}
        placeholder={displayName}
        onConfirm={(name) => {
          if (name) {
            onUpdate({ ...cat, name: { ...cat.name as any, zh: name, en: name, ms: name } });
          }
        }}
      />
      
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={deleteDialog.toggle}
        title="确认删除"
        description={`确定要删除「${displayName}」吗？此操作不可恢复。`}
        confirmText="删除"
        variant="destructive"
        onConfirm={() => onDelete(cat.id)}
      />
    </div>
  );
}

export function CategoriesSection({ 
  categories, addCategory, updateCategory, deleteCategory, cardClass, buttonStyles
}: CategoriesSectionProps) {
  const appLang = useUIStore((s) => s.appLang);
  const [isAddOpen, addDialog] = useDisclosure(false);

  return (
    <section className={cardClass} id="section-categories">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-brand-gold rounded-full"></div>
            分类列表 / Category List
        </h3>
        <span className="text-[10px] text-brand-navy/40 font-black uppercase">{categories.length} Items</span>
      </div>

      <div className="flex gap-2">
        <button onClick={addDialog.open} className={buttonStyles.accent}>
          <Plus size={16} /> {appLang === 'zh' ? '新增分类' : 'Add New'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 p-3 bg-brand-navy/5 rounded-[28px] border border-brand-navy/10 shadow-inner min-h-[48px]">
        {categories.map(cat => (
          <CategoryItem 
            key={cat.id} 
            cat={cat} 
            onUpdate={async (c) => {
              try {
                await updateCategory(String(c.id), { name_zh: (c.name as any)?.zh, name_en: (c.name as any)?.en, name_ms: (c.name as any)?.ms } as any);
              } catch (e) {}
            }}
            onDelete={(id) => deleteCategory(String(id))}
          />
        ))}
      </div>

      <PromptDialog
        open={isAddOpen}
        onOpenChange={addDialog.toggle}
        title={appLang === 'zh' ? '新增分类' : 'New Category'}
        description={appLang === 'zh' ? '输入分类名称：' : 'Category Name:'}
        onConfirm={async (name: string) => {
          if (!name.trim()) return;
          await addCategory(name);
        }}
      />
    </section>
  );
};
