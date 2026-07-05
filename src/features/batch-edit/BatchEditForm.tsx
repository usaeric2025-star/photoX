import React from "react";
import { PhotoEditSchema } from "#lib/valibot/schemas/photo.js";
import { useAppForm } from "#lib/forms/useAppForm.js";
import { useCategories, useManufacturers, useTags, useTranslation } from '#src/hooks/index.js';
import { Field } from "@tanstack/react-form";

import { type PhotoEditFormData } from "#lib/valibot/schemas/photo.js";

interface BatchEditFormProps {
  formState: Record<string, unknown>;
  handleUpdateForm: (data: Record<string, unknown>) => void;
}

const defaultForm: PhotoEditFormData = {
  name: '',
  description: { zh: '', en: '', ms: '' },
  categoryId: null,
  manufacturerId: null,
  groupId: null,
  isGroupCover: false,
  price: null,
  note: null,
  manualCode: null,
  modelNumber: null,
  dimensions: [],
  isHidden: false,
  tags: []
};

export function BatchEditForm({ formState, handleUpdateForm }: BatchEditFormProps) {
  const { categories = [] } = useCategories();
  const { manufacturers = [] } = useManufacturers();
  const { tags = [] } = useTags();
  const formObj = useAppForm({
    schema: PhotoEditSchema,
    defaultValues: { ...defaultForm, ...formState } as PhotoEditFormData,
    onSubmit: async (data) => {
      handleUpdateForm(data as unknown as Record<string, unknown>);
    },
    onValueChange: (data) => {
      handleUpdateForm(data as unknown as Record<string, unknown>);
    }
  });

  const { t, appLang } = useTranslation();
  return (
    <div className="flex-1 overflow-y-auto w-full p-6">
       <form
         onSubmit={(e) => {
           e.preventDefault();
           formObj.submit();
         }}
         className="space-y-6"
       >
         
         <Field form={formObj.form} name="isHidden">
            {({ state, handleChange }) => (
                <div className="space-y-2">
                    <label className="text-sm font-bold">{appLang === 'zh' ? `${t('visibility')} / VISIBILITY` : t('visibility').toUpperCase()}</label>
                    <select 
                      value={state.value === true ? 'true' : state.value === false ? 'false' : ''} 
                      onChange={(e) => {
                          const val = e.target.value;
                          handleChange(val === '' ? undefined : val === 'true');
                      }}
                      className="w-full border p-2 rounded"
                    >
                      <option value="">{t('unchanged')}</option>
                      <option value="false">{t('visible')}</option>
                      <option value="true">{t('hidden')}</option>
                    </select>
                </div>
            )}
         </Field>

         <Field form={formObj.form} name="categoryId">
            {({ state, handleChange }) => (
                <div className="space-y-2">
                    <label className="text-sm font-bold">{appLang === 'zh' ? `${t('category')} / CATEGORY` : t('category').toUpperCase()}</label>
                    <select 
                      value={String(state.value || '')} 
                      onChange={(e) => {
                          handleChange(e.target.value || null);
                      }}
                      className="w-full border p-2 rounded"
                    >
                      <option value="">{t('unchanged')}</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                </div>
            )}
         </Field>

         <Field form={formObj.form} name="tags">
            {({ state, handleChange }) => (
                <div className="space-y-2">
                    <label className="text-sm font-bold">{appLang === 'zh' ? `${t('tags')} / TAGS (ADD)` : `${t('tags').toUpperCase()} (ADD)`}</label>
                    <select 
                      multiple
                      value={state.value || []} 
                      onChange={(e) => {
                          const options = Array.from(e.target.selectedOptions, option => option.value);
                          handleChange(options);
                      }}
                      className="w-full border p-2 rounded min-h-[100px]"
                    >
                      {tags.map(tag => (
                        <option key={tag.id} value={tag.name}>{tag.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500">Select multiple tags to add to all selected photos. Existing tags will not be removed.</p>
                </div>
            )}
         </Field>

         <Field form={formObj.form} name="manufacturerId">
            {({ state, handleChange }) => (
                <div className="space-y-2">
                    <label className="text-sm font-bold">{appLang === 'zh' ? `${t('manufacturer')} / MANUFACTURER` : t('manufacturer').toUpperCase()}</label>
                    <select 
                      value={String(state.value || '')} 
                      onChange={(e) => {
                          handleChange(e.target.value || null);
                      }}
                      className="w-full border p-2 rounded"
                    >
                      <option value="">{t('unchanged')}</option>
                      {manufacturers.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                </div>
            )}
         </Field>

         <button type="submit" className="hidden">Submit</button>
       </form>
       
       <div className="mt-8 text-xs text-slate-400">
         {t('batchEditNote')}
       </div>
    </div>
  );
}
