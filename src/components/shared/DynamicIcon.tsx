import React from 'react';
import { 
  Cloud, 
  Cog, 
  LayoutGrid, 
  Activity, 
  Settings, 
  CheckSquare, 
  Sparkles, 
  LayoutDashboard, 
  Menu, 
  User, 
  Terminal, 
  LogOut, 
  RefreshCw,
  Cpu
} from '@react-zero-ui/icon-sprite';

const iconMap = {
  'cloud': Cloud,
  'cog': Cog,
  'layout-grid': LayoutGrid,
  'activity': Activity,
  'settings': Settings,
  'check-square': CheckSquare,
  'sparkles': Sparkles,
  'layout-dashboard': LayoutDashboard,
  'menu': Menu,
  'user': User,
  'terminal': Terminal,
  'log-out': LogOut,
  'refresh-cw': RefreshCw,
  'cpu': Cpu
} as const;

export interface DynamicIconProps {
  name: keyof typeof iconMap;
  className?: string;
  size?: number | string;
}

export const DynamicIcon = ({ name, className, size, ...props }: DynamicIconProps) => {
  const Icon = iconMap[name];
  if (!Icon) return null;

  return <Icon className={className} size={size} {...props} />;
};
