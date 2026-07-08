import * as Lucide from 'lucide-react';
import { cn } from '#lib/utils.js';

// Explicit references to icons to ensure bundler tree-shaking works perfectly
const iconMap: Record<string, Lucide.LucideIcon> = {
  'home': Lucide.Home,
  'settings': Lucide.Settings,
  'settings-2': Lucide.Settings2,
  'user': Lucide.User,
  'users': Lucide.Users,
  'search': Lucide.Search,
  'plus': Lucide.Plus,
  'minus': Lucide.Minus,
  'x': Lucide.X,
  'x-circle': Lucide.XCircle,
  'check': Lucide.Check,
  'check-circle-2': Lucide.CheckCircle2,
  'chevron-down': Lucide.ChevronDown,
  'chevron-up': Lucide.ChevronUp,
  'arrow-left': Lucide.ArrowLeft,
  'arrow-right': Lucide.ArrowRight,
  'arrow-up': Lucide.ArrowUp,
  'arrow-up-down': Lucide.ArrowUpDown,
  'arrow-up-right': Lucide.ArrowUpRight,
  'refresh-cw': Lucide.RefreshCw,
  'loader-2': Lucide.Loader2,
  'edit': Lucide.Edit,
  'pencil': Lucide.Pencil,
  'trash-2': Lucide.Trash2,
  'copy': Lucide.Copy,
  'save': Lucide.Save,
  'upload': Lucide.Upload,
  'lock': Lucide.Lock,
  'log-out': Lucide.LogOut,
  'maximize-2': Lucide.Maximize2,
  'menu': Lucide.Menu,
  'image': Lucide.Image,
  'image-off': Lucide.ImageOff,
  'image-plus': Lucide.ImagePlus,
  'clock': Lucide.Clock,
  'globe': Lucide.Globe,
  'grid-3x3': Lucide.Grid3X3,
  'layers': Lucide.Layers,
  'inbox': Lucide.Inbox,
  'info': Lucide.Info,
  'alert-circle': Lucide.AlertCircle,
  'alert-triangle': Lucide.AlertTriangle,
  'file-json': Lucide.FileJson,
  'file-text': Lucide.FileText,
  'package-search': Lucide.PackageSearch,
  'hard-drive': Lucide.HardDrive,
  'cpu': Lucide.Cpu,
  'terminal': Lucide.Terminal,
  'heart': Lucide.Heart,
  'star': Lucide.Star,
  'sparkles': Lucide.Sparkles,
  'ghost': Lucide.Ghost,
  'activity': Lucide.Activity,
  'bar-chart-3': Lucide.BarChart3,
  'link': Lucide.Link,
  'share': Lucide.Share2,
  'share-2': Lucide.Share2,
  'eye': Lucide.Eye,
  'eye-off': Lucide.EyeOff,
  'folder-minus': Lucide.FolderMinus,
  'folder-plus': Lucide.FolderPlus,
  'message-circle': Lucide.MessageCircle,
  'shield-alert': Lucide.ShieldAlert,
  'shield-check': Lucide.ShieldCheck,
};

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
  const normalizedName = name.toLowerCase().trim();

  if (normalizedName === 'whatsapp') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={cn(className)}
        style={style}
        onClick={onClick}
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    );
  }

  const LucideIconComponent = iconMap[normalizedName];

  if (!LucideIconComponent) {
    // Fallback: Dynamically lookup in Lucide namespace (PascalCase conversion)
    const pascalName = normalizedName
      .replace(/(^\w|-\w)/g, (m) => m.replace('-', '').toUpperCase());
    const FallbackComponent = (Lucide as unknown as Record<string, Lucide.LucideIcon>)[pascalName];

    if (!FallbackComponent) {
      console.warn(`[Icon] Icon "${name}" not found in explicit map or fallback (PascalCase: ${pascalName})`);
      return <span className={cn("inline-block", className)} style={{ width: size, height: size, ...style }} />;
    }

    return (
      <FallbackComponent
        size={size}
        className={cn(className, solid ? 'fill-current' : '')}
        strokeWidth={strokeWidth}
        fill={fill}
        style={style}
        onClick={onClick}
      />
    );
  }

  return (
    <LucideIconComponent 
      size={size} 
      className={cn(className, solid ? 'fill-current' : '')}
      strokeWidth={strokeWidth}
      fill={fill}
      style={style}
      onClick={onClick}
    />
  );
};
