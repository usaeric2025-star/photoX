import React from 'react';
import { LucideProps } from 'lucide-react';
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
} from 'lucide-react';

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

export type DynamicIconName = keyof typeof iconMap;

interface DynamicIconProps extends LucideProps {
  name: keyof typeof iconMap;
}

/**
 * [OPTIMIZATION]
 * Replaced dynamicIconImports with static mapping.
 * In Vite, dynamicIconImports causes thousands of tiny chunks to be generated, 
 * completely breaking the bundle structure and causing severe layout shifts.
 * Tree-shaking is naturally supported with static named imports in Vite.
 */
export const DynamicIcon = ({ name, ...props }: DynamicIconProps) => {
  const Icon = iconMap[name];
  if (!Icon) return null;

  return <Icon {...props} />;
};
