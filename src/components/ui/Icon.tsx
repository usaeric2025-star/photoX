import React from 'react';
import * as IconLibrary from '@react-zero-ui/icon-sprite';
import { cn } from '@/lib/utils';

// Extract exported names from IconLibrary to re-export them
export * from '@react-zero-ui/icon-sprite';

// ✅ 自動推導圖標名稱型別
export type IconName = keyof typeof IconLibrary;

interface IconProps {
  name: IconName;
  className?: string;
  size?: number | string;
}

export function Icon({ name, className, size = 16 }: IconProps) {
  const IconComponent = (IconLibrary as any)[name];
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }
  return <IconComponent className={cn(className)} width={size} height={size} />;
}

