import React from 'react';
import { Icon } from '#src/components/ui/Icon.js';

interface AdminEmptyStateProps {
  labels: {
    empty?: string;
  };
}

export function AdminEmptyState({ labels }: AdminEmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] animate-fade-in">
      <div className="flex flex-col items-center justify-center py-12 px-8 text-center bg-white rounded-3xl border border-slate-100 shadow-sm max-w-sm w-full mx-4">
        <div className="mb-6">
          <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-inner">
            <Icon name="image-off" size={40} className="text-slate-300" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">{labels.empty || "No photos found"}</h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          Try adjusting your filters or search terms to find what you're looking for.
        </p>
      </div>
    </div>
  );
}
