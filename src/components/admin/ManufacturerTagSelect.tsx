import React, { useMemo } from 'react';
import { Manufacturer } from '@/types';
import { cn } from '@/lib/utils';

interface ManufacturerTagSelectProps {
  manufacturers: Manufacturer[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export const ManufacturerTagSelect = ({ manufacturers, selectedId, onSelect }: ManufacturerTagSelectProps) => {
  return (
    <div
      className="grid gap-2"
      style={{
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
      }}
    >
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          "px-3 py-2 rounded-xl text-xs font-bold transition-all border text-center",
          selectedId === null
            ? "bg-slate-900 text-white border-slate-900"
            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
        )}
      >
        无厂商 / None
      </button>
      {manufacturers.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onSelect(String(m.id))}
          className={cn(
            "px-3 py-2 rounded-xl text-xs font-bold transition-all border text-center truncate",
            selectedId === String(m.id)
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
          )}
        >
          {m.name}
        </button>
      ))}
    </div>
  );
};
