interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
  variant?: 'primary' | 'current';
}

const sizeMap = {
  xs: 'w-3 h-3 border-2',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-3',
  lg: 'w-10 h-10 border-4',
  xl: 'w-14 h-14 border-4',
};

export function LoadingSpinner({ 
  size = 'md', 
  className = '', 
  label = '载入中...',
  variant = 'primary'
}: LoadingSpinnerProps) {
  const colorClass = variant === 'current' 
    ? 'border-current border-t-transparent' 
    : 'border-slate-300 border-t-primary';

  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <div
        className={`
          ${sizeMap[size]}
          ${colorClass}
          rounded-full animate-spin
        `}
        role="status"
        aria-label={label}
      />
      {size !== 'xs' && size !== 'sm' && (
        <span className="text-sm text-slate-500">{label}</span>
      )}
    </div>
  );
}
