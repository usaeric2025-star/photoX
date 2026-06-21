interface LoadingProgressProps {
  value?: number;
  max?: number;
  indeterminate?: boolean;
  className?: string;
  label?: string;
  showPercentage?: boolean;
}

export function LoadingProgress({
  value = 0,
  max = 100,
  indeterminate = false,
  className = '',
  label,
  showPercentage = true,
}: LoadingProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">{label}</span>
          {showPercentage && !indeterminate && (
            <span className="font-medium text-slate-700">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`
            h-full bg-primary rounded-full transition-all duration-500 ease-out
            ${indeterminate ? 'animate-progress-indeterminate w-1/3' : ''}
          `}
          style={!indeterminate ? { width: `${percentage}%` } : undefined}
          role="progressbar"
          aria-valuenow={indeterminate ? undefined : percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
