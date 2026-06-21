import { LoadingSpinner } from './LoadingSpinner';
import { LoadingSkeleton } from './LoadingSkeleton';
import { LoadingProgress } from './LoadingProgress';

interface LoadingContainerProps {
  loading: boolean;
  children: React.ReactNode;
  type?: 'spinner' | 'skeleton' | 'progress' | 'none';
  skeletonType?: 'page' | 'list' | 'grid' | 'card' | 'detail';
  skeletonCount?: number;
  progress?: number;
  progressLabel?: string;
  fallback?: React.ReactNode;
  className?: string;
}

export function LoadingContainer({
  loading,
  children,
  type = 'skeleton',
  skeletonType = 'page',
  skeletonCount = 1,
  progress,
  progressLabel,
  fallback,
  className = '',
}: LoadingContainerProps) {
  if (!loading) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  switch (type) {
    case 'spinner':
      return <LoadingSpinner size="lg" className={className} />;
    case 'skeleton':
      return (
        <LoadingSkeleton 
          type={skeletonType} 
          count={skeletonCount} 
          className={className} 
        />
      );
    case 'progress':
      return (
        <LoadingProgress 
          value={progress} 
          label={progressLabel} 
          className={className} 
        />
      );
    case 'none':
      return null;
    default:
      return <LoadingSpinner size="lg" className={className} />;
  }
}
