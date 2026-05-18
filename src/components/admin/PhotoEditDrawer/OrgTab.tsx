import React from 'react';
import { FormSectionHeader, CategoryGrid, ManufacturerList } from '../FormShared';
import { PhotoTagSelector } from '../edit/PhotoTagSelector';
import { Category, Tag, Manufacturer, ProductFormData } from '../../../types';
import { safeArray } from '../../../lib/utils';

interface Props {
  formState: ProductFormData;
  updateForm: (updates: Partial<ProductFormData>) => void;
  categories: Category[];
  tags: Tag[];
  manufacturers: Manufacturer[];
  appLang: string;
  onAddTag: (name: string) => Promise<string>;
  onUpdateTag: (id: string, updates: Partial<Tag>) => Promise<boolean>;
  onDeleteTag: (id: string) => Promise<boolean>;
  onAddManufacturer: () => void;
  onEditManufacturer: (mfr: Manufacturer) => void;
  onUpdateManufacturer: (id: string, updates: Partial<Manufacturer>) => Promise<boolean>;
  onDeleteManufacturer: (id: string) => void;
}

export const OrgTab: React.FC<Props> = ({
  formState, updateForm, categories, tags, manufacturers, appLang,
  onAddTag, onUpdateTag, onDeleteTag,
  onAddManufacturer, onEditManufacturer, onDeleteManufacturer
}) => {
  return (
    <div className="m-0 p-4 space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
      <section className="space-y-4">
          <FormSectionHeader title="产品目录" subtitle="CATEGORY *" />
          <CategoryGrid 
            categories={categories}
            selectedId={formState.categoryId}
            onSelect={(id) => updateForm({ categoryId: id })}
            appLang={appLang}
          />
      </section>

      <section className="space-y-2">
           <PhotoTagSelector 
              tags={tags}
              selectedTagIds={safeArray<string>(formState.tagIds)}
              onChange={(newIds) => updateForm({ tagIds: newIds })}
              addTag={onAddTag}
              updateTag={(id, name) => onUpdateTag(id, { name })}
              deleteTag={onDeleteTag}
           />
        </section>

      <section className="space-y-4">
        <FormSectionHeader 
          title="厂商名称" 
          subtitle="MANUFACTURER" 
          onAction={onAddManufacturer} 
        />
        <ManufacturerList 
          manufacturers={manufacturers}
          selectedId={formState?.manufacturerId}
          onSelect={(id) => updateForm({ manufacturerId: id })}
          onEdit={onEditManufacturer}
          onDelete={(mfr) => onDeleteManufacturer(mfr.id)}
        />
      </section>
    </div>
  );
};
