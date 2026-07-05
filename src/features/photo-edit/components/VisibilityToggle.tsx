import React from 'react';
import { Icon } from '#src/components/ui/Icon.js';

interface VisibilityToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

export function VisibilityToggle({ value, onChange }: VisibilityToggleProps) {
  return (
    <section className="space-y-4">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex-1 flex flex-col items-center justify-center gap-1 p-4 rounded-2xl border-2 transition-all ${!value ? "bg-green-50 border-green-500 text-green-700" : "bg-white text-slate-400 border-slate-100"}`}
        >
          <Icon name="eye" size={16} />
          <span className="text-[10px] font-black uppercase">显示 (VISIBLE)</span>
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex-1 flex flex-col items-center justify-center gap-1 p-4 rounded-2xl border-2 transition-all ${value === true ? "bg-orange-50 border-orange-500 text-orange-700" : "bg-white text-slate-400 border-slate-100"}`}
        >
          <Icon name="eye-off" size={16} />
          <span className="text-[10px] font-black uppercase">屏蔽 (HIDDEN)</span>
        </button>
      </div>
    </section>
  );
}
