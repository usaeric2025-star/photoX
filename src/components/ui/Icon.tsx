import React from 'react';
import * as IconLibrary from '@react-zero-ui/icon-sprite';
import { cn } from '@/lib/utils';
import {
  Database,
  FileText,
  AlertCircle,
  PackageSearch,
  Zap,
} from 'lucide-react';

// Extract exported names from IconLibrary to re-export them
export * from '@react-zero-ui/icon-sprite';

export {
  Database,
  FileText,
  AlertCircle,
  PackageSearch,
  Zap,
};

const CombinedIcons = { ...IconLibrary, Database, FileText, AlertCircle, PackageSearch, Zap };

// ✅ 自動推導圖標名稱型別
export type IconName = keyof typeof CombinedIcons;

interface IconProps {
  name: IconName;
  className?: string;
  size?: number | string;
}

export function Icon({ name, className, size = 16 }: IconProps) {
  const IconComponent = (CombinedIcons as any)[name];
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }
  return <IconComponent className={cn(className)} width={size} height={size} />;
}
