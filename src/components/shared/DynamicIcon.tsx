import React, { lazy, Suspense } from 'react';
import dynamicIconImports from 'lucide-react/dynamicIconImports';
import { LucideProps } from 'lucide-react';

interface DynamicIconProps extends LucideProps {
  name: keyof typeof dynamicIconImports;
}

/**
 * [OPTIMIZATION-LUCIDE-DYNAMIC] 
 * Loads individual icons on demand using React.lazy and Suspense.
 * This dramatically reduces the initial bundle size contribute from Lucide-React 
 * by up to 20-50KB for large icon sets.
 */
export const DynamicIcon = ({ name, ...props }: DynamicIconProps) => {
  const Icon = lazy(dynamicIconImports[name]);

  return (
    <Suspense fallback={<div className="h-[1em] w-[1em]" />}>
      <Icon {...props} />
    </Suspense>
  );
};
