import React from 'react';
import { ImageOff } from '@/components/ui/Icon';

interface AdminEmptyStateProps {
  labels: {
    empty: string;
    [key: string]: any;
  };
}

export function AdminEmptyState({ labels }: AdminEmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="mb-4">
          <div className="w-16 h-16 bg-white/40 rounded-full flex items-center justify-center border border-white shadow-sm">
            <ImageOff size={32} className="opacity-20 text-brand-navy/20" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-slate-700">{labels.empty || "No photos found"}</h3>
      </div>
    </div>
  );
}
