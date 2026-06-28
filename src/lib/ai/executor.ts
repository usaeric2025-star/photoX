import { createStore } from '@storve/core';
import { signal } from '@storve/core/signals';

interface AIState {
  status: 'idle' | 'processing' | 'completed' | 'failed';
  photoId?: string;
  result?: unknown;
  error?: string;
}

const aiStore = createStore<{ aiStatus: AIState }>({ aiStatus: { status: 'idle' } });

export const aiAnalysisSignal = signal<{ aiStatus: AIState }, 'aiStatus'>(aiStore, 'aiStatus');
