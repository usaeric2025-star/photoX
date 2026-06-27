export type TaskState =
  | { status: 'queued' }
  | { status: 'processing'; progress: number; message?: string }
  | { status: 'completed'; result?: unknown }
  | { status: 'failed'; error: string; retryable: boolean; retryCount: number }
  | { status: 'cancelled' };

export type TaskType = 'upload' | 'ai-analyze' | 'repair' | 'sync';

export interface Task<T = unknown> {
  id: string;
  label: string;
  type: TaskType;
  state: TaskState;
  createdAt: number;
  userId?: string;
  meta?: Record<string, unknown>;
  execute: (signal: AbortSignal, onProgress: (progress: number, message?: string) => void) => Promise<T>;
}

