import React from 'react';
import { Icon, IconName } from '@/components/ui/Icon';

const map: Record<string, IconName> = {
  'cloud': 'Cloud',
  'cog': 'Cog',
  'layout-grid': 'Grid', // Or LayoutGrid? I need to check IconName
  'activity': 'Activity',
  'settings': 'Settings',
  'check-square': 'CheckSquare',
  'sparkles': 'Sparkles',
  'layout-dashboard': 'LayoutDashboard',
  'menu': 'Menu',
  'user': 'User',
  'terminal': 'Terminal',
  'log-out': 'LogOut',
  'refresh-cw': 'RefreshCw',
  'cpu': 'Cpu'
};

export interface DynamicIconProps {
  name: string;
  className?: string;
  size?: number | string;
}

export const DynamicIcon = ({ name, className, size, ...props }: DynamicIconProps) => {
  const iconName = map[name] as IconName;
  
  if (iconName) {
    return <Icon name={iconName} className={className} size={size} {...props} />;
  }

  // Robust fallback: convert kebab-case to PascalCase (e.g. arrow-up -> ArrowUp)
  const pascalName = name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('') as IconName;

  return <Icon name={pascalName} className={className} size={size} {...props} />;
};
