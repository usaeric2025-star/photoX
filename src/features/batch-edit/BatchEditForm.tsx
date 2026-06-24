import React from "react";
import { PhotoEditSchema } from "@/schemas/photoEdit";
import { useAppForm } from "@/lib/form/useAppForm";
import { useCategories, useManufacturers } from "@/hooks";
import { Field } from "@tanstack/react-form";

import { type PhotoEditFormData } from "@/schemas/photoEdit";

interface BatchEditFormProps {
  formState: Record<string, unknown>;
  handleUpdateForm: (data: Record<string, unknown>) => void;
  [key: string]: unknown;
}

const defaultForm: PhotoEditFormData = {
  name: '',
  description: { zh: '', en: '', ms: '' },
  category_id: null,
  manufacturer_id: null,
  group_id: null,
  is_group_cover: false,
  price: null,
  note: null,
  manual_code: null,
  model_number: null,
  dimensions: {},
  is_hidden: false,
  tags: []
};

export function BatchEditForm({ formState, handleUpdateForm }: BatchEditFormProps) {
  const { data: categories = [] } = useCategories();
  const { data: manufacturers = [] } = useManufacturers();
  const formObj = useAppForm({
    schema: PhotoEditSchema,
    defaultValues: { ...defaultForm, ...formState } as PhotoEditFormData,
    onSubmit: async (data) => {
      handleUpdateForm(data);
    },
    onValueChange: (data) => {
      handleUpdateForm(data);
    }
  });

  return (
    <div className="flex-1 overflow-y-auto w-full p-6">
       <form
         onSubmit={(e) => {
           e.preventDefault();
           formObj.submit();
         }}
         className="space-y-6"
       >
         
         <Field form={formObj.form} name="is_hidden">
            {({ state, handleChange }) => (
                <div className="space-y-2">
                    <label className="text-sm font-bold">显示状态 / VISIBILITY</label>
                    <select 
                      value={state.value === true ? 'true' : state.value === false ? 'false' : ''} 
                      onChange={(e) => {
                          const val = e.target.value;
                          handleChange(val === '' ? undefined : val === 'true');
                      }}
                      className="w-full border p-2 rounded"
                    >
                      <option value="">保持不变 (Unchanged)</option>
                      <option value="false">显示 (Visible)</option>
                      <option value="true">屏蔽 (Hidden)</option>
                    </select>
                </div>
            )}
         </Field>

         <Field form={formObj.form} name="category_id">
            {({ state, handleChange }) => (
                <div className="space-y-2">
                    <label className="text-sm font-bold">分类 / CATEGORY</label>
                    <select 
                      value={String(state.value || '')} 
                      onChange={(e) => {
                          handleChange(e.target.value || null);
                      }}
                      className="w-full border p-2 rounded"
                    >
                      <option value="">保持不变 (Unchanged)</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                </div>
            )}
         </Field>

         <Field form={formObj.form} name="manufacturer_id">
            {({ state, handleChange }) => (
                <div className="space-y-2">
                    <label className="text-sm font-bold">厂商 / MANUFACTURER</label>
                    <select 
                      value={String(state.value || '')} 
                      onChange={(e) => {
                          handleChange(e.target.value || null);
                      }}
                      className="w-full border p-2 rounded"
                    >
                      <option value="">保持不变 (Unchanged)</option>
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
         * Note: Form properties are staged automatically upon selection. Use the top bar to Apply.
       </div>
    </div>
  );
}
