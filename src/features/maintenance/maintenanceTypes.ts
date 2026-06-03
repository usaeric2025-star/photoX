export interface PreviewResult {
  affectedCount: number;
  details?: any;
}

export interface JobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  processed: number;
  total: number;
  message?: string;
  error?: string;
}

export interface MaintenanceAction {
  name: string;
  preview: () => Promise<PreviewResult>;
  execute: () => Promise<{ jobId: string; message?: string }>;
  getStatus?: (jobId: string) => Promise<JobStatus>;
}
