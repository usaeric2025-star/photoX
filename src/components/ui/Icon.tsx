import React from 'react';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';

// Mapping Lucide icons to internal library
const IconLibrary: Record<string, React.ElementType> = {
  Activity: Icons.Activity,
  AlertCircle: Icons.AlertCircle,
  AlertTriangle: Icons.TriangleAlert,
  ArrowLeft: Icons.ArrowLeft,
  ArrowUp: Icons.ArrowUp,
  ArrowUpDown: Icons.ArrowUpDown,
  ArrowUpRight: Icons.ArrowUpRight,
  BarChart3: Icons.BarChart3,
  Camera: Icons.Camera,
  Check: Icons.Check,
  CheckCircle2: Icons.CheckCircle2,
  CheckSquare: Icons.CheckSquare,
  ChevronDown: Icons.ChevronDown,
  ChevronLeft: Icons.ChevronLeft,
  ChevronRight: Icons.ChevronRight,
  ChevronUp: Icons.ChevronUp,
  Clock: Icons.Clock,
  Cloud: Icons.Cloud,
  CloudDownload: Icons.CloudDownload,
  Cog: Icons.Cog,
  Copy: Icons.Copy,
  Cpu: Icons.Cpu,
  Database: Icons.Database,
  Download: Icons.Download,
  Edit: Icons.Edit,
  Eye: Icons.Eye,
  EyeOff: Icons.EyeOff,
  FileJson: Icons.FileJson,
  FileQuestion: Icons.FileQuestion,
  FileText: Icons.FileText,
  FolderMinus: Icons.FolderMinus,
  FolderOpen: Icons.FolderOpen,
  FolderPlus: Icons.FolderPlus,
  Ghost: Icons.Ghost,
  Globe: Icons.Globe,
  Grid: Icons.Grid3X3,
  HardDrive: Icons.HardDrive,
  Heart: Icons.Heart,
  History: Icons.History,
  Home: Icons.Home,
  Image: Icons.Image,
  ImageOff: Icons.ImageOff,
  ImagePlus: Icons.ImagePlus,
  Info: Icons.Info,
  Layers: Icons.Layers,
  LayoutDashboard: Icons.LayoutDashboard,
  LayoutGrid: Icons.LayoutGrid,
  List: Icons.List,
  Loader2: Icons.Loader2,
  Lock: Icons.Lock,
  LogIn: Icons.LogIn,
  LogOut: Icons.LogOut,
  Maximize2: Icons.Maximize2,
  Menu: Icons.Menu,
  MessageCircle: Icons.MessageCircle,
  MoreHorizontal: Icons.MoreHorizontal,
  MoreVertical: Icons.MoreVertical,
  PackageOpen: Icons.PackageOpen,
  PackageSearch: Icons.PackageSearch,
  Pencil: Icons.Pencil,
  Pin: Icons.Pin,
  Plus: Icons.Plus,
  RefreshCcw: Icons.RefreshCcw,
  RefreshCw: Icons.RefreshCw,
  Save: Icons.Save,
  Search: Icons.Search,
  ServerCrash: Icons.ServerCrash,
  Settings: Icons.Settings,
  Settings2: Icons.Settings2,
  Share: Icons.Share,
  Shield: Icons.Shield,
  ShieldAlert: Icons.ShieldAlert,
  ShieldCheck: Icons.ShieldCheck,
  Sparkles: Icons.Sparkles,
  Square: Icons.Square,
  Star: Icons.Star,
  Tags: Icons.Tags,
  Terminal: Icons.Terminal,
  Trash2: Icons.Trash2,
  Upload: Icons.Upload,
  User: Icons.User,
  Users: Icons.Users,
  Wifi: Icons.Wifi,
  WifiOff: Icons.WifiOff,
  X: Icons.X,
  XCircle: Icons.XCircle,
  Zap: Icons.Zap,
};

// Re-export individually for direct use
export const Activity = IconLibrary.Activity;
export const AlertCircle = IconLibrary.AlertCircle;
export const AlertTriangle = IconLibrary.AlertTriangle;
export const ArrowLeft = IconLibrary.ArrowLeft;
export const ArrowUp = IconLibrary.ArrowUp;
export const ArrowUpDown = IconLibrary.ArrowUpDown;
export const ArrowUpRight = IconLibrary.ArrowUpRight;
export const BarChart3 = IconLibrary.BarChart3;
export const Camera = IconLibrary.Camera;
export const Check = IconLibrary.Check;
export const CheckCircle2 = IconLibrary.CheckCircle2;
export const CheckSquare = IconLibrary.CheckSquare;
export const ChevronDown = IconLibrary.ChevronDown;
export const ChevronLeft = IconLibrary.ChevronLeft;
export const ChevronRight = IconLibrary.ChevronRight;
export const ChevronUp = IconLibrary.ChevronUp;
export const Clock = IconLibrary.Clock;
export const Cloud = IconLibrary.Cloud;
export const CloudDownload = IconLibrary.CloudDownload;
export const Cog = IconLibrary.Cog;
export const Copy = IconLibrary.Copy;
export const Cpu = IconLibrary.Cpu;
export const Database = IconLibrary.Database;
export const Download = IconLibrary.Download;
export const Edit = IconLibrary.Edit;
export const Eye = IconLibrary.Eye;
export const EyeOff = IconLibrary.EyeOff;
export const FileJson = IconLibrary.FileJson;
export const FileQuestion = IconLibrary.FileQuestion;
export const FileText = IconLibrary.FileText;
export const FolderMinus = IconLibrary.FolderMinus;
export const FolderOpen = IconLibrary.FolderOpen;
export const FolderPlus = IconLibrary.FolderPlus;
export const Ghost = IconLibrary.Ghost;
export const Globe = IconLibrary.Globe;
export const Grid = IconLibrary.Grid;
export const HardDrive = IconLibrary.HardDrive;
export const Heart = IconLibrary.Heart;
export const History = IconLibrary.History;
export const Home = IconLibrary.Home;
export const Image = IconLibrary.Image;
export const ImageOff = IconLibrary.ImageOff;
export const ImagePlus = IconLibrary.ImagePlus;
export const Info = IconLibrary.Info;
export const Layers = IconLibrary.Layers;
export const LayoutDashboard = IconLibrary.LayoutDashboard;
export const LayoutGrid = IconLibrary.LayoutGrid;
export const List = IconLibrary.List;
export const Loader2 = IconLibrary.Loader2;
export const Lock = IconLibrary.Lock;
export const LogIn = IconLibrary.LogIn;
export const LogOut = IconLibrary.LogOut;
export const Maximize2 = IconLibrary.Maximize2;
export const Menu = IconLibrary.Menu;
export const MessageCircle = IconLibrary.MessageCircle;
export const MoreHorizontal = IconLibrary.MoreHorizontal;
export const PackageOpen = IconLibrary.PackageOpen;
export const PackageSearch = IconLibrary.PackageSearch;
export const Pencil = IconLibrary.Pencil;
export const Pin = IconLibrary.Pin;
export const Plus = IconLibrary.Plus;
export const RefreshCcw = IconLibrary.RefreshCcw;
export const RefreshCw = IconLibrary.RefreshCw;
export const Save = IconLibrary.Save;
export const Search = IconLibrary.Search;
export const ServerCrash = IconLibrary.ServerCrash;
export const Settings = IconLibrary.Settings;
export const Settings2 = IconLibrary.Settings2;
export const Share = IconLibrary.Share;
export const Shield = IconLibrary.Shield;
export const ShieldAlert = IconLibrary.ShieldAlert;
export const ShieldCheck = IconLibrary.ShieldCheck;
export const Sparkles = IconLibrary.Sparkles;
export const Square = IconLibrary.Square;
export const Star = IconLibrary.Star;
export const Tags = IconLibrary.Tags;
export const Terminal = IconLibrary.Terminal;
export const Trash2 = IconLibrary.Trash2;
export const Upload = IconLibrary.Upload;
export const User = IconLibrary.User;
export const Users = IconLibrary.Users;
export const Wifi = IconLibrary.Wifi;
export const WifiOff = IconLibrary.WifiOff;
export const X = IconLibrary.X;
export const XCircle = IconLibrary.XCircle;
export const Zap = IconLibrary.Zap;

// ✅ 自動推導圖標名稱型別
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
