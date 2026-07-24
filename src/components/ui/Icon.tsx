import { 
  Home, Settings, Settings2, User, Users, Search, Plus, Minus, X, XCircle, 
  Check, CheckCircle2, ChevronDown, ChevronUp, ArrowLeft, ArrowRight, 
  ArrowUp, ArrowUpDown, ArrowUpRight, RefreshCw, Loader2, Edit, Pencil, 
  Trash2, Copy, Save, Upload, Lock, LogOut, Maximize2, Menu, Image, 
  ImageOff, ImagePlus, Clock, Globe, Grid3X3, Layers, Inbox, Info, 
  AlertCircle, AlertTriangle, FileJson, FileText, PackageSearch, 
  HardDrive, Cpu, Terminal, Heart, Star, Sparkles, Ghost, Activity, 
  BarChart3, Link, Share2, Eye, EyeOff, FolderMinus, FolderPlus, 
  MessageCircle, ShieldAlert, ShieldCheck, Camera, LayoutDashboard,
  LogIn, LayoutGrid, LayoutList, Filter, SortAsc, SortDesc, ShoppingBag,
  ShoppingCart, Hash, History, Type, Palette, Smartphone, Laptop, Tablet,
  CheckSquare, ExternalLink, Factory, MoreVertical, Shield, ChevronLeft, 
  ChevronRight, ChevronsLeft, ChevronsRight, ArrowLeftRight, Download, 
  RotateCcw, RefreshCcw, Maximize, Minimize, Bell, Calendar, Mail, Phone, MapPin,
  HeartOff, StarHalf, Play, Pause, Square, Circle, Triangle, LucideIcon
} from 'lucide-react';
import { cn } from '#lib/utils.js';

// Explicit references to icons to ensure bundler tree-shaking works perfectly
const iconMap: Record<string, LucideIcon> = {
  'home': Home,
  'settings': Settings,
  'settings-2': Settings2,
  'user': User,
  'users': Users,
  'search': Search,
  'plus': Plus,
  'minus': Minus,
  'x': X,
  'x-circle': XCircle,
  'check': Check,
  'check-circle-2': CheckCircle2,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevrons-left': ChevronsLeft,
  'chevrons-right': ChevronsRight,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-up': ArrowUp,
  'arrow-up-down': ArrowUpDown,
  'arrow-up-right': ArrowUpRight,
  'arrow-left-right': ArrowLeftRight,
  'refresh-cw': RefreshCw,
  'loader-2': Loader2,
  'edit': Edit,
  'pencil': Pencil,
  'trash-2': Trash2,
  'copy': Copy,
  'save': Save,
  'upload': Upload,
  'lock': Lock,
  'log-out': LogOut,
  'maximize': Maximize,
  'maximize-2': Maximize2,
  'minimize': Minimize,
  'menu': Menu,
  'image': Image,
  'image-off': ImageOff,
  'image-plus': ImagePlus,
  'clock': Clock,
  'globe': Globe,
  'grid-3x3': Grid3X3,
  'layers': Layers,
  'inbox': Inbox,
  'info': Info,
  'alert-circle': AlertCircle,
  'alert-triangle': AlertTriangle,
  'file-json': FileJson,
  'file-text': FileText,
  'package-search': PackageSearch,
  'hard-drive': HardDrive,
  'cpu': Cpu,
  'terminal': Terminal,
  'heart': Heart,
  'star': Star,
  'sparkles': Sparkles,
  'ghost': Ghost,
  'activity': Activity,
  'bar-chart-3': BarChart3,
  'link': Link,
  'share': Share2,
  'share-2': Share2,
  'eye': Eye,
  'eye-off': EyeOff,
  'folder-minus': FolderMinus,
  'folder-plus': FolderPlus,
  'message-circle': MessageCircle,
  'shield-alert': ShieldAlert,
  'shield-check': ShieldCheck,
  'camera': Camera,
  'layout-dashboard': LayoutDashboard,
  'log-in': LogIn,
  'layout-grid': LayoutGrid,
  'layout-list': LayoutList,
  'filter': Filter,
  'sort-asc': SortAsc,
  'sort-desc': SortDesc,
  'shopping-bag': ShoppingBag,
  'shopping-cart': ShoppingCart,
  'hash': Hash,
  'history': History,
  'type': Type,
  'palette': Palette,
  'smartphone': Smartphone,
  'laptop': Laptop,
  'tablet': Tablet,
  'check-square': CheckSquare,
  'check-square-2': CheckSquare,
  'external-link': ExternalLink,
  'factory': Factory,
  'more-vertical': MoreVertical,
  'shield': Shield,
  'download': Download,
  'rotate-ccw': RotateCcw,
  'refresh-ccw': RefreshCcw,
  'bell': Bell,
  'calendar': Calendar,
  'mail': Mail,
  'phone': Phone,
  'map-pin': MapPin,
  'heart-off': HeartOff,
  'star-half': StarHalf,
  'play': Play,
  'pause': Pause,
  'square': Square,
  'circle': Circle,
  'triangle': Triangle,
  'whatsapp': MessageCircle,
};

import { logger } from '#src/lib/logger.js';

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
  if (!name) return null;
  const normalizedName = String(name).toLowerCase().trim();

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
    logger.warn(`[Icon] Icon "${name}" not found in explicit map.`);
    return <span className={cn("inline-block", className)} style={{ width: size, height: size, ...style }} />;
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
