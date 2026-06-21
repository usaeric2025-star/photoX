import React from 'react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export * from 'lucide-react';
export { TriangleAlert as AlertTriangle, Grid3X3 as Grid } from 'lucide-react';


const IconLibrary: Record<string, any> = {
  ...LucideIcons,
  AlertTriangle: LucideIcons.TriangleAlert,
  Grid: LucideIcons.Grid3X3,
};

export type IconName = keyof typeof IconLibrary;

interface IconProps {
  name: IconName;
  className?: string;
  size?: number | string;
  solid?: boolean;
}

export function Icon({ name, className, size = 20, solid = false }: IconProps) {
  const IconComponent = IconLibrary[name];
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in curated library`);
    return null;
  }

  return (
    <IconComponent 
      className={cn(className, solid ? 'fill-current' : '')} 
      width={size} 
      height={size} 
      strokeWidth={1.75}
    />
  );
}
