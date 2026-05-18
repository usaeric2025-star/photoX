import React from 'react';

export const Skeleton: React.FC<{ className?: string, children?: React.ReactNode }> = ({ className, children }) => (
  <div className={`animate-pulse bg-brand-navy/10 rounded-md ${className}`}>
    {children}
  </div>
);

export const PhotoCardSkeleton: React.FC = () => (
  <div className="aspect-square w-full animate-pulse bg-brand-navy/10 rounded-xl" />
);
