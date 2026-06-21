import { LucideIcon as LucideIconBase } from 'lucide-react-sprite';
import { cn } from '@/lib/utils';

export type IconName = string;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  solid?: boolean;
  strokeWidth?: number;
  fill?: string;
  style?: React.CSSProperties;
  onClick?: (e?: React.MouseEvent) => void;
}

export const Icon = ({ 
  name, 
  size = 20, 
  className = '', 
  solid = false,
  strokeWidth,
  fill,
  style,
  onClick
}: IconProps) => {
  // Normalize icon names from PascalCase/camelCase to kebab-case (Sprite style)
  const normalizedName = name
    .replace(/([A-Z])/g, (match, offset) => (offset > 0 ? '-' : '') + match.toLowerCase())
    .replace(/-+/g, '-');

  // Defensive check: If LucideIconBase is not correctly imported/defined, fallback to a spacer
  if (typeof LucideIconBase !== 'function' && typeof LucideIconBase !== 'object') {
    return <span className={cn("inline-block", className)} style={{ width: size, height: size, ...style }} />;
  }

  return (
    <LucideIconBase 
      name={normalizedName as any} 
      size={size} 
      className={cn(className, solid ? 'fill-current' : '')}
      strokeWidth={strokeWidth}
      fill={fill}
      style={style}
      onClick={onClick}
    />
  );
};

export const LucideIcon = Icon;
