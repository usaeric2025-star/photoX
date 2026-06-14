import React, { useState, useMemo, useRef } from 'react';
import { useController } from 'react-hook-form';
import { Manufacturer } from '@/types';
import { ChevronDown, Search } from 'lucide-react';

interface ManufacturerSelectProps {
  name: string;
  manufacturers: Manufacturer[];
}

export const ManufacturerSelect = ({ name, manufacturers }: ManufacturerSelectProps) => {
  const { field, fieldState } = useController({ name });
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = manufacturers.filter(m => m.name.toLowerCase().includes(query.toLowerCase()));

  const selectedName = manufacturers.find(m => m.id === field.value)?.name || '';

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        className="w-full flex items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl text-sm font-bold shadow-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedName || '选择厂商 (Select Manufacturer)'}</span>
        <ChevronDown size={16} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl p-2">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              autoFocus
              className="w-full outline-none text-sm"
              placeholder="搜索..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.map(m => (
              <button
                key={m.id}
                type="button"
                className={`w-full text-left p-3 rounded-lg text-sm ${field.value === m.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}
                onClick={() => {
                  field.onChange(m.id);
                  setIsOpen(false);
                  setQuery('');
                }}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {fieldState.error && (
        <span className="text-red-500 text-xs mt-1 block">{fieldState.error.message}</span>
      )}
    </div>
  );
};
