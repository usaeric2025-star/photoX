import React from 'react';
import { useSignal } from '#lib/store';
import { aiAnalysisSignal } from '#lib/ai/executor';
import { Icon } from '#src/components/ui/Icon';

export function AIStatusBadge() {
  const aiStatus = useSignal(aiAnalysisSignal);

  if (aiStatus.status === 'idle') return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-xs font-medium">
      {aiStatus.status === 'processing' && <Icon name="refresh-cw" className="w-3 h-3 animate-spin" />}
      {aiStatus.status === 'completed' && <Icon name="check-circle" className="w-3 h-3" />}
      {aiStatus.status === 'failed' && <Icon name="alert-circle" className="w-3 h-3 text-rose-500" />}
      <span className="capitalize">{aiStatus.status}</span>
    </div>
  );
}
