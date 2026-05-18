import React from 'react';
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress';

interface UploadProgressProps {
  progress: number;
  fileName: string;
  status: 'uploading' | 'success' | 'error';
}

export const UploadProgress = ({ progress, fileName, status }: UploadProgressProps) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="truncate" title={fileName}>{fileName}</span>
        <span>{status === 'uploading' ? `${Math.round(progress)}%` : 
                status === 'success' ? '✓ 完成' : '✗ 失败'}</span>
      </div>
      <Progress className="h-2">
        <ProgressTrack>
          <ProgressIndicator style={{ width: `${progress}%` }} />
        </ProgressTrack>
      </Progress>
    </div>
  );
};
