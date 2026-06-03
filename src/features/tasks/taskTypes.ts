export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface UnifiedTask {
  id: string;
  source: 'maintenance' | 'ai' | 'upload'; // 任务来源
  type: string; // 具体操作类型
  title: string;
  status: TaskStatus;
  progress: number;
  processed?: number;
  total?: number;
  message?: string;
  createdAt: string;
  updatedAt: string;
  jobId?: string; // 关联的后端 jobId
}
