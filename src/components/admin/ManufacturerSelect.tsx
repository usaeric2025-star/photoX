import React from 'react';
import { Field } from "@tanstack/react-form";
import { FormApi } from "@tanstack/react-form";
import { Manufacturer } from '#src/types/index.js';
import { useTranslation } from '#src/hooks/index.js';

interface ManufacturerSelectProps {
  form: unknown;
  name: string;
  manufacturers: Manufacturer[];
}

export const ManufacturerSelect = ({ form, name, manufacturers }: ManufacturerSelectProps) => {
  const { t } = useTranslation();
  return (
    <Field form={form as never} name={name as never}>
      {(field) => (
        <div className="w-full space-y-2">
          <div className="flex flex-wrap gap-2">
            {manufacturers.length > 0 ? (
              manufacturers.map((m) => {
                const isSelected = field.state.value === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      field.handleChange(isSelected ? null : m.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                      isSelected
                        ? "bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/20"
                        : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 active:bg-slate-200"
                    }`}
                  >
                    {m.name}
                  </button>
                );
              })
            ) : (
              <div className="text-sm text-slate-400">{t('noManufacturers')}</div>
            )}
          </div>
          
          {field.state.meta.errors.length > 0 && (
            <span className="text-red-500 text-xs mt-1 block">{String(field.state.meta.errors[0])}</span>
          )}
        </div>
      )}
    </Field>
  );
};
