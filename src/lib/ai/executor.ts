import { signal } from '@storve/core/signals';
import { taskStore } from '@/store/taskStore';

export const aiAnalysisSignal = signal(taskStore, 'aiStatus');
