import React from 'react';
import { useFieldArray, useFormContext, UseFormRegister } from 'react-hook-form';
import { cn } from '@/lib/utils';

interface DynamicArrayFieldProps<T> {
  name: string
  label: string
  defaultValue: T
  renderItem: (index: number, field: T, register: UseFormRegister<any>) => React.ReactNode
}

export const DynamicArrayField = <T extends Record<string, any>,>({ 
  name, 
  label, 
  defaultValue, 
  renderItem 
}: DynamicArrayFieldProps<T>) => {
  const { control, register } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });
  
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2 items-start bg-slate-50 p-2 rounded-md">
            <div className="flex-1">
              {renderItem(index, field as T, register)}
            </div>
            <button 
              type="button" 
              onClick={() => remove(index)} 
              className="text-red-500 hover:text-red-700 text-xs mt-2"
            >
              刪除
            </button>
          </div>
        ))}
      </div>
      <button 
        type="button" 
        onClick={() => append(defaultValue)} 
        className="w-full py-2 border-2 border-dashed border-slate-300 rounded-md text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors text-sm"
      >
        + 新增 {label}
      </button>
    </div>
  );
};
