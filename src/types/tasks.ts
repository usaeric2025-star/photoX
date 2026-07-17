export type TaskStatus = 'processing' | 'completed' | 'failed' | 'cancelled' | 'queued';

export interface UnifiedTask {
  id: string;
  source: 'session' | 'maintenance';
  title: string;
  status: TaskStatus;
  progress: number;
  message?: string;
  processed?: number;
  total?: number;
  createdAt: number;
  finishedAt?: number;
  jobId?: string;
  issueId?: string;
}
