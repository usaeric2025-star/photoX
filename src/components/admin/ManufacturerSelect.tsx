import React from 'react';
import { useField, useFormContext } from "el-form-react-hooks";
import { Manufacturer } from '@/types';

interface ManufacturerSelectProps {
  name: string;
  manufacturers: Manufacturer[];
}

export const ManufacturerSelect = ({ name, manufacturers }: ManufacturerSelectProps) => {
  const { form } = useFormContext();
  const { value, error } = useField(name);

  return (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap gap-2">
        {/* allow deselecting by having an explicit none option or just toggle */}
        {manufacturers.length > 0 ? (
          manufacturers.map((m) => {
            const isSelected = value === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                   form.setValue(name, isSelected ? null : m.id);
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
          <div className="text-sm text-slate-400">尚无厂商，请先添加 / No manufacturers yet</div>
        )}
      </div>
      
      {error && (
        <span className="text-red-500 text-xs mt-1 block">{String(error)}</span>
      )}
    </div>
  );
};
