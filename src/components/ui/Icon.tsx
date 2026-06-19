import React from 'react';
import * as Icons from '@react-zero-ui/icon-sprite';
import { cn } from '@/lib/utils';

// ✅ 應用定義的圖標名稱型別（獨立於圖標庫）
export type IconName =
  | 'Camera'
  | 'Edit'
  | 'Trash2'
  | 'Search'
  | 'Menu'
  | 'X'
  | 'Check'
  | 'ChevronDown'
  | 'ChevronUp'
  | 'Loader2'
  | 'Plus'
  | 'Save'
  | 'Refresh'
  | 'Home'
  | 'Settings'
  | 'Users'
  | 'Tag'
  | 'Image'
  | 'Folder'
  | 'AlertCircle'
  | 'Info'
  | 'RefreshCw'
  | 'ShieldAlert'
  | 'Zap'
  | 'CheckCircle2'
  | 'Clock'
  | 'BarChart3'
  | 'History'
  | 'AlertTriangle'
  | 'PackageSearch'
  | 'ArrowUpDown'
  | 'Copy'
  | 'Layers'
  | 'Grid'
  | 'Pin'
  | 'Heart'
  | 'PackageOpen'
  | 'ArrowLeft'
  | 'Terminal'
  | 'Globe'
  | 'Ghost'
  | 'Sparkles'
  | 'Package';

interface IconProps {
  name: IconName;
  className?: string;
  size?: number | string;
}

export function Icon({ name, className, size = 16 }: IconProps) {
  const IconComponent = Icons[name as keyof typeof Icons];
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }
  return <IconComponent className={cn(className)} width={size} height={size} />;
}
