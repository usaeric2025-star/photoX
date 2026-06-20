import React, { useState, useRef } from 'react';
import { useField, useFormContext } from "el-form-react-hooks";
import { Manufacturer } from '@/types';
import { ChevronDown, Search } from '@/components/ui/Icon';

interface ManufacturerSelectProps {
  name: string;
  manufacturers: Manufacturer[];
}

import { NativePopover } from '@/components/ui/NativePopover';

export const ManufacturerSelect = ({ name, manufacturers }: ManufacturerSelectProps) => {
  const { form } = useFormContext();
  const { value, error } = useField(name as any);
  const [query, setQuery] = useState('');

  const filtered = manufacturers.filter(m => m.name.toLowerCase().includes(query.toLowerCase()));

  const selectedName = manufacturers.find(m => m.id === value)?.name || '';

  return (
    <div className="w-full">
      <NativePopover
        className="!min-w-0 w-[var(--trigger-width)]"
        trigger={
          <div
            className="w-full flex items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl text-sm font-bold shadow-sm cursor-pointer"
          >
            <span>{selectedName || '选择厂商 (Select Manufacturer)'}</span>
            <ChevronDown size={16} />
          </div>
        }
      >
        <div className="p-2 min-w-[260px]">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              autoFocus
              className="w-full outline-none text-sm bg-transparent"
              placeholder="搜索..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()} // Prevents closing popover when clicking input
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map(m => (
                <button
                  key={m.id}
                  type="button"
                  className={`w-full text-left p-3 rounded-lg text-sm mb-0.5 last:mb-0 transition-colors ${
                    value === m.id ? 'bg-slate-900 text-white font-bold' : 'hover:bg-slate-100'
                  }`}
                  onClick={() => {
                    form.setValue(name as any, m.id);
                  }}
                >
                  {m.name}
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-slate-400 text-xs italic">无结果</div>
            )}
          </div>
        </div>
      </NativePopover>
      
      {error && (
        <span className="text-red-500 text-xs mt-1 block">{String(error)}</span>
      )}
    </div>
  );
};
