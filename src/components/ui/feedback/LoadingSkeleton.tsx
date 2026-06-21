interface LoadingSkeletonProps {
  type?: 'page' | 'list' | 'card' | 'grid' | 'detail';
  count?: number;
  className?: string;
  /** 是否显示头部骨架 */
  showHeader?: boolean;
}

export function LoadingSkeleton({ 
  type = 'page', 
  count = 1, 
  className = '',
  showHeader = true,
}: LoadingSkeletonProps) {
  const renderSkeleton = () => {
    switch (type) {
      case 'page':
        return (
          <div className="space-y-6">
            {showHeader && (
              <div className="space-y-3">
                <div className="h-9 w-48 bg-slate-200 rounded-lg animate-pulse" />
                <div className="h-4 w-72 bg-slate-100 rounded animate-pulse" />
              </div>
            )}
            <div className="space-y-4">
              <div className="h-4 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 bg-slate-100 rounded animate-pulse w-11/12" />
              <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-slate-100 rounded animate-pulse w-2/3" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="h-24 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-24 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          </div>
        );

      case 'list':
        return (
          <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50">
                <div className="w-12 h-12 bg-slate-200 rounded-full animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
                </div>
                <div className="w-16 h-8 bg-slate-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        );

      case 'grid':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-square bg-slate-200 rounded-lg animate-pulse" />
                <div className="h-3 bg-slate-200 rounded animate-pulse w-3/4" />
                <div className="h-2 bg-slate-100 rounded animate-pulse w-1/2" />
              </div>
            ))}
          </div>
        );

      case 'card':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="border rounded-xl p-5 space-y-4 bg-white">
                <div className="h-32 bg-slate-200 rounded-lg animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-20 bg-slate-100 rounded animate-pulse" />
                  <div className="h-8 w-20 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        );

      case 'detail':
        return (
          <div className="space-y-6">
            <div className="flex gap-6">
              <div className="w-1/3 aspect-square bg-slate-200 rounded-xl animate-pulse" />
              <div className="flex-1 space-y-4">
                <div className="h-8 bg-slate-200 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-slate-100 rounded animate-pulse w-full" />
                <div className="h-4 bg-slate-100 rounded animate-pulse w-2/3" />
                <div className="flex gap-2 pt-4">
                  <div className="h-10 w-24 bg-slate-200 rounded animate-pulse" />
                  <div className="h-10 w-24 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return <div className={className}>{renderSkeleton()}</div>;
}
