import React, { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { useClickOutside } from '@/hooks/core/useClickOutside';
import { PromptDialog } from "@/components/ui/PromptDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useLongPress } from "@/hooks/core/useLongPress";
import { Category } from '../../types';
import { useUIStore } from '@/store/useUIStore';
import { useFormSubmit } from '@/lib/form/useFormSubmit';
import { type } from 'arktype';

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

  const menuRef = useClickOutside<HTMLDivElement>(() => {
    if (activeMenuId === cat.id) setActiveMenuId(null);
  });

  useLongPress(menuRef, {
    delay: 400,
    onLongPress: () => {
      setActiveMenuId(cat.id);
    }
  });

  let displayName = '未命名分类';
  if (appLang === 'zh') displayName = cat.nameZh || cat.zh || cat.name;
  else if (appLang === 'en') displayName = cat.nameEn || cat.en || cat.name;
  else if (appLang === 'ms') displayName = cat.nameMs || cat.ms || cat.name;

  return (
      <div
      ref={menuRef}
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
              <Icon name="pencil" size={12} /> 编辑名称
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteDialog.open();
                setActiveMenuId(null);
              }}
              className="px-3 py-2 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-lg flex items-center gap-2"
            >
              <Icon name="trash-2" size={12} /> 删除
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
            onUpdate({ ...cat, name: name, nameZh: name, nameEn: name, nameMs: name });
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

  const { submit: runUpdateCategory } = useFormSubmit({
    schema: type({ id: 'string', updates: 'unknown' }),
    mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
      await updateCategory(id, updates);
      return true;
    },
    successMessage: '更新分類成功',
    errorMessage: '更新分類失敗'
  });

  const { submit: runDeleteCategory } = useFormSubmit({
    schema: type({ id: 'string' }),
    mutationFn: async ({ id }: { id: string }) => {
      await deleteCategory(id);
      return true;
    },
    successMessage: '刪除分類成功',
    errorMessage: '刪除分類失敗'
  });

  const { submit: runAddCategory } = useFormSubmit({
    schema: type({ name: 'string' }),
    mutationFn: async ({ name }: { name: string }) => {
      await addCategory(name);
      return true;
    },
    successMessage: '新增分類成功',
    errorMessage: '新增分類失敗'
  });

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
          <Icon name="plus" size={16} /> {appLang === 'zh' ? '新增分类' : 'Add New'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 p-3 bg-brand-navy/5 rounded-[28px] border border-brand-navy/10 shadow-inner min-h-[48px]">
        {categories.map(cat => (
          <CategoryItem 
            key={cat.id} 
            cat={cat} 
            onUpdate={(c) => {
              runUpdateCategory({ 
                id: String(c.id), 
                updates: { 
                  name_zh: c.nameZh || c.name, 
                  name_en: c.nameEn || c.name, 
                  name_ms: c.nameMs || c.name 
                } 
              });
            }}
            onDelete={(id) => runDeleteCategory({ id: String(id) })}
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
          await runAddCategory({ name });
        }}
      />
    </section>
  );
};
