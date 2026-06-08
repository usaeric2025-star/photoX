export type UploadState = 
  | { status: 'direct' }           // R2 直传
  | { status: 'relay'; endpoint: string }        // 服务端中转（明确决策）
  | { status: 'failed'; reason: string; retryable: boolean; userMessage?: string }; // 终态

const RELAY_THRESHOLD = 4 * 1024 * 1024; // 4MB

export function resolveUploadStrategy(fileSize: number, directUploadError?: unknown): UploadState {
  // 1. 优先尝试 R2 直传（无大小限制）
  if (!directUploadError) {
    return { status: 'direct' };
  }
  
  // 2. 直传失败 + 文件小于阈值 → 走中转
  if (fileSize <= RELAY_THRESHOLD) {
    return { status: 'relay', endpoint: '/api/upload-direct' };
  }
  
  // 3. 直传失败 + 文件过大 → 明确告知用户重试直传，而非静默降级到中转
  return { 
    status: 'failed', 
    reason: 'DIRECT_UPLOAD_FAILED_LARGE_FILE', 
    retryable: true,
    userMessage: '图片大于4MB且直传网络不稳定，请检查网络后重试' 
  };
}
