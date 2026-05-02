import React, { useState } from 'react';
import { 
  ChevronLeft, X, Cloud, LogOut, RefreshCcw, 
  Trash2, Download, Upload, MessageCircle, 
  Plus, Settings2, Image as ImageIcon, Sparkles, Lock, CloudUpload, CloudDownload,
  User, Heart, Smile, Layout, ChevronRight, CheckCircle2, AlertCircle, Save, Pencil
} from 'lucide-react';
import { SubCategory, Tag, Category } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { testAiConnection } from '../services/geminiService';
import { addTagToDB, deleteTagFromDB, templateService } from '../services/supabaseService';
import { normalizeTagName, normalizeManufacturerName } from '../utils/stringHelper';
import { useAdminSession, useAdminPhoto, useAdminUI } from '../context/AdminContexts';
import { UVTSTemplate } from '../types/uvts';

interface SettingsScreenProps {
  setActiveScreen: (screen: 'home' | 'add' | 'manage' | 'settings') => void;
  settings: any;
  setSettings: (s: any) => void;
  saveSettings: (s: any) => Promise<boolean>;
  manufacturers: SubCategory[];
  setManufacturers: React.Dispatch<React.SetStateAction<SubCategory[]>>;
  tags: Tag[];
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>;
  user: any;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  triggerManualSync: () => Promise<void>;
  isSyncing: boolean;
  syncPercent: number;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  setCategories: React.Dispatch<React.SetStateAction<any[]>>;
  categories: any[];
  performPushSync: () => Promise<void>;
  performPullSync: () => Promise<void>;
  cloudCount: number | null;
  lastSyncTime: number | null;
  geminiApiKey: string;
  setGeminiApiKey: (k: string) => void;
  customModel: string;
  setCustomModel: (m: string) => void;
  internalPassword: string;
  setInternalPassword: (p: string) => void;
  photos: any[];
  setPhotos: (p: any[]) => void;
}

const obfuscateKey = (key: string) => {
  if (!key) return '';
  return btoa(key).split('').reverse().join('');
};

const TagItem = ({ tag, activeTagMenuId, setActiveTagMenuId, handleUpdateTagName, deleteTag, isPinned, togglePin }: any) => {
  const [isPressing, setIsPressing] = useState(false);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsPressing(true);
    timerRef.current = setTimeout(() => {
      setIsPressing(false);
      setActiveTagMenuId(tag.id);
    }, 600);
  };

  const handleEnd = () => {
    setIsPressing(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <div 
      className={`bg-white border border-[#1D3557]/10 pl-4 pr-2 py-1.5 rounded-full flex items-center gap-2 shadow-sm transition-all active:scale-95 relative ${isPressing || activeTagMenuId === tag.id ? 'bg-[#D4A853]/10 border-[#D4A853]/30 scale-95' : ''}`}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onContextMenu={(e) => {
        e.preventDefault();
        setActiveTagMenuId(tag.id);
      }}
    >
      <span className="text-[11px] font-black text-[#1D3557] uppercase tracking-tight select-none flex items-center gap-1">
        {isPinned && <Heart size={10} className="text-[#D4A853] fill-[#D4A853] shrink-0" />}
        {tag.name}
      </span>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button className="text-[#1D3557]/20 hover:text-[#D4A853] p-1 rounded-full">
            <X size={14} />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>确定要删除标签 #{tag.name} 吗？</AlertDialogTitle>
             <AlertDialogDescription>无法撤销且会从所有照片中移除。</AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
              <AlertDialogCancel variant="outline" size="default">关闭</AlertDialogCancel>
              <AlertDialogAction variant="destructive" size="default" onClick={() => deleteTag(tag.id)}>删除</AlertDialogAction>
           </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AnimatePresence>
        {activeTagMenuId === tag.id && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1D3557] rounded-xl shadow-xl p-1 flex flex-col gap-0.5 z-[101] min-w-[120px]"
          >
            <button 
              onClick={(e) => {
                e.stopPropagation();
                togglePin(tag.id);
                setActiveTagMenuId(null);
              }}
              className="px-3 py-2 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-lg flex items-center gap-2"
            >
              <Heart size={12} className={isPinned ? "fill-white" : ""} /> {isPinned ? '取消推荐' : '设为推荐'}
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleUpdateTagName(tag);
                setActiveTagMenuId(null);
              }}
              className="px-3 py-2 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-lg flex items-center gap-2"
            >
              <Pencil size={12} /> 编辑
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                deleteTag(tag.id);
                setActiveTagMenuId(null);
              }}
              className="px-3 py-2 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-lg flex items-center gap-2"
            >
              <Trash2 size={12} /> 删除
            </button>
            <div 
              className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1D3557] rotate-45 -mt-1"
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {activeTagMenuId === tag.id && (
        <div 
          className="fixed inset-0 z-[100]" 
          onClick={(e) => {
            e.stopPropagation();
            setActiveTagMenuId(null);
          }}
        />
      )}
    </div>
  );
};

import { SYSTEM_TEMPLATES } from '../constants/systemTemplates';

export const SettingsScreen: React.FC<SettingsScreenProps> = (props) => {
  const { 
    settings, user, loginWithGoogle, logout, syncPercent, 
    geminiApiKey, setGeminiApiKey, customModel, setCustomModel, 
    internalPassword, setInternalPassword,
    setSettings
  } = useAdminSession();
  const { 
    manufacturers, tags, photos, categories, adTemplates,
    setTags, setCategories, setManufacturers, setPhotos, setAdTemplates,
    updateTag, deleteTag, updateCategory, deleteCategory, addCategory, addManufacturer, updateManufacturer, deleteManufacturer, quickAddTag
  } = useAdminPhoto();
  const { loadingState, setAlertDialog, setPromptDialog, showToast, withLoading } = useAdminUI();

  const { setActiveScreen, handleLogoUpload, performPushSync, performPullSync, cloudCount, lastSyncTime, saveSettings, isSyncing } = props;
  const [testResult, setTestResult] = useState<{ success?: boolean, error?: string, loading?: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<'photo' | 'ad'>('photo');
  const [hasChanges, setHasChanges] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [uvtsInput, setUvtsInput] = useState('');

  const seedTemplates = async () => {
    await withLoading('saving', async () => {
      try {
        const results = [];
        for (const t of SYSTEM_TEMPLATES) {
          // Check if already exists by style_name
          const exists = adTemplates.find(existing => existing.name === t.style_name);
          if (!exists) {
            const newT = await templateService.saveTemplate(
              t.style_name,
              t.description || "System Template",
              t
            );
            results.push(newT);
          }
        }
        if (results.length > 0) {
          setAdTemplates(prev => [...results, ...prev]);
          showToast(`成功初始化 ${results.length} 个模板 / Seeded ${results.length} templates`, 'success');
        } else {
          showToast('模板库已是最新 / Templates are already up to date', 'success');
        }
      } catch (err: any) {
        showToast(`初始化失败: ${err.message}`, 'error');
      }
    });
  };

  // Debounced save for settings
  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const debouncedSave = (newSettings: any) => {
    if (saveTimer) clearTimeout(saveTimer);
    const timer = setTimeout(() => {
      saveSettings(newSettings);
      setHasChanges(false);
    }, 1500);
    setSaveTimer(timer);
  };

  const testConnection = async () => {
    setTestResult({ loading: true });
    const result = await testAiConnection(geminiApiKey, settings.provider || 'auto', customModel);
    setTestResult(result);
  };

  const handleAddManufacturer = () => {
    setPromptDialog({
      title: '新增生产商',
      message: '输入生产商名称:',
      onSubmit: async (name: string) => {
        if (!name.trim()) return;
        await addManufacturer(name.trim());
      }
    });
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    await addCategory(newCategoryName.trim());
    setNewCategoryName('');
  };

  const handleAddTag = () => {
    setPromptDialog({
      title: '新增标签',
      message: '输入标签名称:',
      onSubmit: async (name: string) => {
        if (!name.trim()) return;
        const normalized = name.trim().toUpperCase();
        try {
          const newTag = await addTagToDB(normalized);
          if (newTag) {
            setTags(prev => [...prev, newTag]);
          }
        } catch (error: any) {
          showToast(`添加失败: ${error.message}`, 'error');
        }
      }
    });
  };

  const [activeTagMenuId, setActiveTagMenuId] = useState<string | null>(null);

  const handleUpdateTagName = (tag: Tag) => {
    setPromptDialog({
      title: '编辑标签名 / Edit Tag Name',
      message: '输入新的标签名称 / Enter new tag name:',
      placeholder: tag.name,
      onSubmit: async (newName) => {
        const normalized = normalizeTagName(newName);
        if (normalized && normalized !== tag.name) {
          await updateTag(tag.id, normalized);
          setHasChanges(true); // Optional: if updateTag does not sync it itself
        }
      }
    });
  };

  const togglePin = (tagId: string) => {
    const currentPinned = settings?.pinnedTags || [];
    let nextPinned;
    if (currentPinned.includes(tagId)) {
      nextPinned = currentPinned.filter((id: string) => id !== tagId);
    } else {
      nextPinned = [...currentPinned, tagId];
    }
    const nextSettings = { ...settings, pinnedTags: nextPinned };
    setSettings(nextSettings);
    setHasChanges(true);
    debouncedSave(nextSettings);
  };

  const handleLongPressTag = (tag: Tag) => {
    // We already have activeTagMenuId to show the menu
    setActiveTagMenuId(tag.id);
  };

  const handleUpdateMfrName = async (mfr: any) => {
    setPromptDialog({
      title: '编辑生产商 / Edit Manufacturer',
      message: '输入新名称 / Enter new name:',
      placeholder: mfr.name,
      onSubmit: async (newName) => {
        const normalized = normalizeManufacturerName(newName);
        if (normalized && normalized !== mfr.name) {
          await updateManufacturer(String(mfr.id), normalized);
          setHasChanges(true);
        }
      }
    });
  };

  const handleUpdateCatName = async (cat: Category) => {
    setPromptDialog({
      title: '编辑分类 / Edit Category',
      message: '输入新名称 / Enter new name:',
      placeholder: cat.name,
      onSubmit: async (newName) => {
        if (newName && newName.trim() !== cat.name) {
          await updateCategory(cat.id, { name: newName.trim() });
          setHasChanges(true);
        }
      }
    });
  };

  const setSettingField = (field: string, value: any) => {
    const newSettings = { ...settings, [field]: value };
    setSettings(newSettings);
    setHasChanges(true);
  };

  // Consistent Button Classes
  const primaryBtnClass = "px-5 py-2.5 bg-[#1D3557] hover:bg-[#1D3557]/90 text-[#FDFAF6] rounded-2xl text-xs font-medium tracking-wide shadow-md active:scale-95 transition-all flex items-center gap-2 justify-center disabled:opacity-50";
  const secondaryBtnClass = "px-5 py-2.5 bg-[#FDFAF6] border border-[#1D3557]/20 hover:bg-[#1D3557]/5 text-[#1D3557] rounded-2xl text-xs font-medium tracking-wide shadow-sm active:scale-95 transition-all flex items-center gap-2 justify-center disabled:opacity-50";
  const accentBtnClass = "px-5 py-2.5 bg-[#D4A853] hover:bg-[#D4A853]/90 text-white rounded-2xl text-xs font-medium tracking-wide shadow-md active:scale-95 transition-all flex items-center gap-2 justify-center disabled:opacity-50";
  
  const inputClass = "flex-1 min-w-0 bg-[#1D3557]/5 border border-[#1D3557]/10 p-3 rounded-2xl text-sm outline-none focus:border-[#D4A853] focus:bg-white shadow-inner font-normal tracking-tight placeholder:text-[#1D3557]/30 text-[#1D3557]";
  const cardClass = "bg-white rounded-[32px] p-6 shadow-sm border border-[#1D3557]/10 space-y-4";

  return (
    <div className="fixed inset-0 z-[500] bg-[#FDFAF6] flex flex-col pt-safe">
      {/* Header */}
      <div className="px-6 py-4 flex items-center gap-3 bg-[#FDFAF6] sticky top-0 z-10">
        <button 
          onClick={() => setActiveScreen('home')} 
          className="p-2 -ml-2 text-[#1D3557]/50 hover:text-[#1D3557] transition-colors rounded-full active:bg-[#1D3557]/5"
          id="btn-settings-back"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="font-black text-xs text-[#1D3557] border border-[#1D3557]/10 px-3 py-1 rounded-xl bg-white shadow-sm inline-block italic leading-none uppercase tracking-widest flex-1 ml-1">设置与管理</h2>
        <button 
           onClick={async () => {
             if (hasChanges) {
               await saveSettings({ ...settings });
               setHasChanges(false);
               showToast("保存成功 / Saved successfully", "success");
             } else {
               showToast("没有更改需要保存 / No changes to save", "success");
             }
           }}
           className={`p-2 rounded-lg shadow-md active:scale-95 transition-all flex items-center justify-center ${hasChanges ? 'bg-[#D4A853] hover:bg-[#D4A853]/90 text-white' : 'bg-[#1D3557] hover:bg-[#1D3557]/90 text-white'}`}
        >
            <Save size={16} />
        </button>
        <Settings2 size={20} className="text-[#1D3557]/20" />
      </div>

      {/* Settings Tabs */}
      <div className="px-6 mb-2">
        <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button 
            onClick={() => setActiveTab('photo')}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'photo' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
          >
            照片与系统 / PHOTO
          </button>
          <button 
            onClick={() => setActiveTab('ad')}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ad' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
          >
            广告与海报 / AD DESIGN
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar pb-32">
        <AnimatePresence mode="wait">
          {activeTab === 'photo' ? (
            <motion.div 
              key="photo-tab"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6"
            >
              {/* Logo Section */}
              <div className={cardClass} id="section-logo">
            <h4 className="font-black text-[#1D3557] text-[10px] uppercase tracking-widest flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <div className="w-1.5 h-3.5 bg-[#D4A853] rounded-full"></div>
                Logo 设置
              </span>
            </h4>
            <div className="flex items-center gap-5">
                <div className="relative group">
                  {settings?.logo_url ? (
                      <img src={settings.logo_url} className="w-16 h-16 rounded-3xl object-cover shadow-md border-2 border-white p-1 bg-white" alt="Logo" />
                  ) : (
                      <div className="w-16 h-16 bg-[#1D3557]/5 rounded-3xl flex flex-col items-center justify-center text-[#1D3557]/20 shadow-inner border border-[#1D3557]/10 italic">
                        <ImageIcon size={20} className="mb-1" />
                        <span className="text-[8px]">暂无 Logo</span>
                      </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <label className="relative overflow-hidden block">
                    <span className={secondaryBtnClass}>
                      <Upload size={14} /> 上传 Logo
                    </span>
                    <input 
                      type="file" 
                      onChange={(e) => handleLogoUpload(e, categories, tags, manufacturers, showToast)} 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      accept="image/*" 
                    />
                  </label>
                  <p className="text-[9px] text-[#1D3557]/40 font-black uppercase tracking-tighter leading-relaxed px-1">推荐比例 1:1</p>
                </div>
            </div>
        </div>

        {/* Sync Section Refined */}
        <div className="bg-[#1D3557] rounded-[32px] p-6 shadow-xl border border-white/5 space-y-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4A853]/10 blur-3xl -mr-10 -mt-10 group-hover:bg-[#D4A853]/20 transition-all duration-700"></div>
          
          <div className="flex items-center justify-between">
            <h4 className="font-black text-white text-[10px] uppercase tracking-widest flex items-center gap-2">
              <Cloud size={18} className={user ? 'text-[#D4A853]' : 'text-white/30'} />
              云端存储管理
            </h4>
            {user && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#D4A853]/20 rounded-full border border-[#D4A853]/30">
                <div className="w-1.5 h-1.5 bg-[#D4A853] rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-[#D4A853] uppercase tracking-wider">已连接</span>
              </div>
            )}
          </div>

          {!user ? (
            <button 
              onClick={loginWithGoogle}
              className="w-full py-4 bg-white hover:bg-[#FDFAF6] text-[#1D3557] rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-all"
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
              使用 Google 登录
            </button>
          ) : (
            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/10">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} className="w-10 h-10 rounded-full border border-white/20" alt="Avatar" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#D4A853]/20 flex items-center justify-center text-[#D4A853] font-black border border-[#D4A853]/20">
                    {String(user?.displayName || 'U').charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-black truncate uppercase tracking-tight">{user?.displayName}</p>
                  <p className="text-[9px] text-white/40 truncate font-bold tracking-tighter">{user?.email}</p>
                </div>
                <button 
                  onClick={logout}
                  className="p-2 text-white/30 hover:text-[#D4A853] transition-colors"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={performPushSync}
                  disabled={isSyncing}
                  className="bg-[#D4A853] hover:bg-[#D4A853]/90 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 active:scale-95 transition-all"
                >
                  <CloudUpload size={16} /> 备份至云端
                </button>
                <button 
                  onClick={performPullSync}
                  disabled={isSyncing}
                  className="bg-white/10 hover:bg-white/20 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 active:scale-95 transition-all placeholder:border-white/20"
                >
                  <CloudDownload size={16} /> 从云端恢复
                </button>
              </div>

              <div className="text-center p-2 bg-black/20 rounded-xl border border-white/5">
                <p className="text-[10px] text-white/40 uppercase tracking-widest leading-loose">
                  云端: <span className="text-white font-black">{cloudCount !== null ? cloudCount : '---'} 张</span> | 
                  最近同步: <span className="text-white font-black">{lastSyncTime ? new Date(lastSyncTime).toLocaleString('zh-CN', { hour12: false }) : '无'}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* AI & Password Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={cardClass} id="section-ai">
              <h4 className="font-black text-[#1D3557] text-[10px] uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={16} className="text-[#D4A853]" />
                AI 智能设定
              </h4>
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-[#1D3557]/40 uppercase ml-1 tracking-widest">AI API 密钥</p>
                  <input 
                    type="password" 
                    placeholder="输入 API 密钥..."
                    className={`${inputClass} font-mono`}
                    value={geminiApiKey}
                    onChange={(e) => {
                      setGeminiApiKey(e.target.value);
                      localStorage.setItem('gemini_api_key', e.target.value); // Plaintext
                    }}
                    onBlur={(e) => {
                      setSettingField('gemini_api_key', e.target.value);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-[#1D3557]/40 uppercase ml-1 tracking-widest">自定义模型</p>
                  <input 
                    type="text" 
                    placeholder="例如 gemini-2.0-flash"
                    className={`${inputClass} font-mono`}
                    value={customModel}
                    onChange={(e) => {
                      setCustomModel(e.target.value);
                      localStorage.setItem('ai_custom_model', e.target.value);
                    }}
                    onBlur={(e) => {
                      setSettingField('custom_model', e.target.value);
                    }}
                  />
                  <button 
                    onClick={testConnection}
                    disabled={testResult?.loading}
                    className="w-full mt-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    {testResult?.loading ? '检测中...' : '测试 AI 连接'}
                  </button>
                  {testResult && !testResult.loading && (
                    <div className={`mt-2 p-3 rounded-xl text-[10px] flex items-center gap-2 ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {testResult.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      {testResult.success ? '连接成功！' : `连接失败: ${testResult.error}`}
                    </div>
                  )}
                </div>
              </div>
          </div>

          <div className={cardClass} id="section-password">
              <h4 className="font-black text-[#1D3557] text-[10px] uppercase tracking-widest flex items-center gap-2">
                <Lock size={16} className="text-[#D4A853]" />
                员工密钥
              </h4>
              <p className="text-[10px] text-[#1D3557]/40 font-black uppercase tracking-tight leading-relaxed">
                执行内部可见内容操作时需要此密钥。
              </p>
              <input 
                type="password" 
                placeholder="设置密钥..."
                className={`${inputClass} font-mono tracking-widest`}
                value={internalPassword}
                onChange={(e) => {
                  setInternalPassword(e.target.value);
                  localStorage.setItem('internal_password', e.target.value);
                }}
                onBlur={(e) => {
                  setSettingField('internal_password', e.target.value);
                }}
              />
          </div>
        </div>

        {/* Categories Section (Read-only) */}
        <section className={cardClass} id="section-categories">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-[#1D3557] text-[10px] uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-3.5 bg-blue-500 rounded-full"></div>
                分类 / Categories (只读 / Read-only)
            </h3>
            <span className="text-[10px] text-[#1D3557]/40 font-black uppercase">{categories.length} 个项目</span>
          </div>
          
          <div className="flex flex-wrap gap-2 p-3 bg-[#1D3557]/5 rounded-[28px] border border-[#1D3557]/10 shadow-inner min-h-[48px]">
            {categories.map(cat => (
              <div key={cat.id} className="bg-white border border-[#1D3557]/10 px-4 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
                <span className="text-[11px] font-black text-[#1D3557] uppercase tracking-tight">
                   {cat.name}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Manufacturers Section */}
        <section className={cardClass} id="section-manufacturers">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-[#1D3557] text-[10px] uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-3.5 bg-[#1D3557] rounded-full"></div>
              生产商
            </h3>
            <span className="text-[10px] text-[#1D3557]/40 font-black uppercase">{(manufacturers || []).length} 个项目</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddManufacturer} className={accentBtnClass}>
              <Plus size={16} /> 新增生产商
            </button>
          </div>
          <div className="flex flex-wrap gap-2 p-3 bg-[#1D3557]/5 rounded-[28px] border border-[#1D3557]/10 shadow-inner min-h-[48px]">
            {(manufacturers || []).map(sub => (
              <div key={sub.id} className="bg-white border border-[#1D3557]/10 pl-3 pr-2 py-1 rounded-full flex items-center gap-2 shadow-sm animate-in fade-in zoom-in duration-300">
                <span 
                   className="text-[11px] font-black text-[#1D3557] uppercase tracking-tight cursor-pointer"
                   onClick={() => handleUpdateMfrName(sub)}
                >
                   {sub.name}
                </span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="text-[#1D3557]/20 hover:text-[#D4A853] p-1 rounded-full"><X size={14} /></button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确定要删除生产商 #{sub.name} 吗？</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant="outline" size="default">关闭</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" size="default" onClick={() => deleteManufacturer(String(sub.id))}>删除</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        </section>

        {/* Tags Section */}
        <section className={cardClass} id="section-tags">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-[#1D3557] text-[10px] uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-3.5 bg-[#D4A853] rounded-full"></div>
              常用标签
            </h3>
            <span className="text-[10px] text-[#1D3557]/40 font-black uppercase">{(tags || []).length} 个项目</span>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={handleAddTag} className={accentBtnClass}>
              <Plus size={16} /> 新增标签
            </button>
            <div className="flex items-center gap-2 bg-[#1D3557]/5 px-3 py-1.5 rounded-full border border-[#1D3557]/10 ml-auto h-full">
               <span className="text-[10px] font-black text-[#1D3557] uppercase tracking-widest flex items-center gap-1">
                 <Heart size={12} className="text-[#D4A853] fill-[#D4A853]" /> 推荐数量
               </span>
               <input 
                 type="number"
                 min={1}
                 max={50}
                 className="w-12 text-center bg-white border border-[#1D3557]/10 text-xs font-black text-[#1D3557] rounded-md py-1 outline-none focus:border-[#D4A853]"
                 value={settings?.hotTagsCount !== undefined ? settings.hotTagsCount : 9}
                 onChange={(e) => {
                   let num: any = parseInt(e.target.value);
                   if (isNaN(num)) num = '';
                   const nextSettings = { ...settings, hotTagsCount: num };
                   setSettings(nextSettings);
                   setHasChanges(true);
                   debouncedSave(nextSettings);
                 }}
               />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 p-3 bg-[#1D3557]/5 rounded-[28px] border border-[#1D3557]/10 shadow-inner min-h-[48px]">
            {(Array.from(tags || []) as any[]).sort((a: any, b: any) => {
               const ap = (settings?.pinnedTags || []).includes(a.id) ? 1 : 0;
               const bp = (settings?.pinnedTags || []).includes(b.id) ? 1 : 0;
               if (ap !== bp) return bp - ap;
               return String(a.name).localeCompare(String(b.name));
            }).map((tag: any) => (
              <TagItem 
                key={tag.id}
                tag={tag}
                activeTagMenuId={activeTagMenuId}
                setActiveTagMenuId={setActiveTagMenuId}
                handleUpdateTagName={handleUpdateTagName}
                deleteTag={deleteTag}
                isPinned={(settings?.pinnedTags || []).includes(tag.id)}
                togglePin={togglePin}
              />
            ))}
          </div>
        </section>


        {/* Export Data */}
        <div className={cardClass}>
            <h4 className="font-black text-[#1D3557] text-[10px] uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-3.5 bg-slate-800 rounded-full"></div>
              数据维护
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  const data = JSON.stringify({ photos, categories, tags, manufacturers });
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `furniture_backup_${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                }}
                className={primaryBtnClass}
              >
                导出 JSON
              </button>
              <label className={secondaryBtnClass + " cursor-pointer"}>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="application/json" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      try {
                        const json = JSON.parse(event.target?.result as string);
                        if (json.photos) setPhotos(json.photos);
                        if (json.tags) setTags(json.tags);
                        if (json.manufacturers) setManufacturers(json.manufacturers);
                        showToast('数据导入成功！', 'success');
                      } catch (err) {
                        showToast('导入失败: 格式错误', 'error');
                      }
                    };
                    reader.readAsText(file);
                  }}
                />
                导入 JSON
              </label>
            </div>
          </div>

          {/* WhatsApp 联系人设定 (Original Location) */}
          <div className={cardClass} id="section-whatsapp">
              <h4 className="font-black text-[#1D3557] text-[10px] uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-3.5 bg-[#25D366] rounded-full"></div>
                WhatsApp 联系人设定
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 pl-1 mb-2">
                      <User size={12} className="text-slate-400" />
                      <label className="text-[10px] font-black text-[#1D3557]/40 uppercase tracking-widest leading-none pt-0.5">联系人 A</label>
                  </div>
                  <div className="flex gap-2">
                    <input type="text" placeholder="姓名" className={inputClass} value={settings?.whatsapp_1_name || ''} onChange={(e) => setSettingField('whatsapp_1_name', e.target.value)} />
                    <input type="text" placeholder="号码" className={`${inputClass} flex-[1.5]`} value={settings?.whatsapp_1 || ''} onChange={(e) => setSettingField('whatsapp_1', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 pl-1 mb-2">
                      <User size={12} className="text-slate-400" />
                      <label className="text-[10px] font-black text-[#1D3557]/40 uppercase tracking-widest leading-none pt-0.5">联系人 B</label>
                  </div>
                  <div className="flex gap-2">
                    <input type="text" placeholder="姓名" className={inputClass} value={settings?.whatsapp_2_name || ''} onChange={(e) => setSettingField('whatsapp_2_name', e.target.value)} />
                    <input type="text" placeholder="号码" className={`${inputClass} flex-[1.5]`} value={settings?.whatsapp_2 || ''} onChange={(e) => setSettingField('whatsapp_2', e.target.value)} />
                  </div>
                </div>
              </div>
          </div>
            </motion.div>
          ) : (
            <motion.div 
              key="ad-tab"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
          {/* Ad Maker System Config (Ad Design Tab) */}
          <div className={cardClass} id="section-ad-maker">
              <h4 className="font-black text-[#1D3557] text-[10px] uppercase tracking-widest flex items-center justify-between gap-2 mb-6">
                <span className="flex items-center gap-2">
                  <div className="w-1.5 h-3.5 bg-blue-600 rounded-full"></div>
                  广告海报系统设定 / AD ENGINE CONFIG
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-[9px] font-black uppercase">引擎就绪</span>
                </div>
              </h4>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Brand Identity */}
                <div className="lg:col-span-1 space-y-6 pr-0 lg:pr-6 lg:border-r border-slate-100">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">品牌视觉主色</label>
                    <div className="flex flex-wrap gap-2 py-1">
                      {['#1D3557', '#E63946', '#2A9D8F', '#F4A261', '#000000'].map((c) => (
                        <button key={c} onClick={() => setSettingField('ad_brand_color', c)} 
                          className={`w-7 h-7 rounded-lg border-2 transition-all ${(settings?.ad_brand_color || '#1D3557') === c ? 'border-blue-600 ring-4 ring-blue-50' : 'border-white shadow-sm'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">全局 Slogan 预设</label>
                    <input type="text" className={inputClass} value={settings?.ad_default_tagline || ''} onChange={(e) => setSettingField('ad_default_tagline', e.target.value)} placeholder="例如: 极致品质, 触手可及" />
                  </div>
                </div>

                {/* Right: Template & Figma Management */}
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1 mb-3 flex items-center justify-between">
                      海报模板仓库 / TEMPLATE LIBRARY
                      <span className="text-blue-600 font-bold">后台同步已激活</span>
                    </label>
                    
                    <div className="space-y-4">
                      {/* Control Panel */}
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setActiveTab('ad')} 
                          className="flex-1 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"
                        >
                          <Plus size={14} /> 新置模板
                        </button>
                        <button 
                          onClick={seedTemplates}
                          disabled={loadingState.saving}
                          className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                        >
                          <Sparkles size={14} className="text-blue-600" /> 初始化预设
                        </button>
                        <button className="px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center">
                          <RefreshCcw size={14} />
                        </button>
                      </div>

                      {/* Template List */}
                      <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {adTemplates.length === 0 ? (
                          <div className="p-10 text-center bg-slate-50 border border-dashed border-slate-200 rounded-[32px] space-y-3">
                             <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                               <Layout size={24} />
                             </div>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">目前暂无自定义模板</p>
                          </div>
                        ) : (
                          adTemplates.map((t) => (
                            <div key={t.id} className="group bg-white border border-slate-100 p-4 rounded-3xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-blue-600 relative overflow-hidden">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h5 className="text-xs font-black text-slate-900 uppercase truncate">{t.name}</h5>
                                    <span className="text-[7px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-black">UVTS-1.1</span>
                                  </div>
                                  <p className="text-[9px] text-slate-400 font-medium line-clamp-1 mb-2 italic">
                                    {t.description || '无具体描述'}
                                  </p>
                                  <div className="flex items-center gap-3">
                                     <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 bg-slate-200 rounded-full"></div>
                                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">
                                          {new Date(t.created_at).toLocaleDateString()}
                                        </span>
                                     </div>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <button 
                                    onClick={() => {
                                      setUvtsInput(JSON.stringify(t.uvts_json, null, 2));
                                      showToast('内容已加载至编辑器', 'success');
                                    }}
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button 
                                    onClick={async () => {
                                      if (confirm(`确定要永久删除模板 [${t.name}] 吗？`)) {
                                        await withLoading('deleting', async () => {
                                          await templateService.deleteTemplate(t.id);
                                          setAdTemplates(prev => prev.filter(item => item.id !== t.id));
                                          showToast('模板已从后台移除');
                                        });
                                      }
                                    }}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Sparkles size={14} className="text-blue-600" />
                        新建模板 / IMPORT NEW
                      </label>
                      <button 
                         onClick={() => {
                            const sample = {
                               version: "UVTS-1.1",
                               style_name: "NEW_TEMPLATE",
                               canvas: { ratio: "1:1", background: "#FFFFFF" },
                               structure: { info_layer: { width_pct: 40, align: "left", padding_pct: 10 }, image_layer: { width_pct: 60, position: "right", fit: "cover" } },
                               typography: { "#Product_Name": { font: "Inter", size_em: 1, weight: "bold", color: "#000000" } },
                               rules: { auto_shrink_text: true, currency_symbol_spacing: "4px" }
                            };
                            setUvtsInput(JSON.stringify(sample, null, 2));
                         }}
                         className="text-[9px] text-blue-600 font-bold uppercase tracking-widest hover:underline"
                      >
                         加载示例
                      </button>
                    </div>
                    
                    <div className="relative">
                      <textarea 
                        value={uvtsInput}
                        onChange={(e) => setUvtsInput(e.target.value)}
                        className="w-full h-48 p-4 bg-slate-50 border border-slate-100 rounded-[2rem] outline-none focus:ring-2 focus:ring-blue-100 font-mono text-[10px] transition-all resize-none shadow-inner"
                        placeholder='粘贴来自 Figma 或 AI 的 UVTS 模板 JSON...'
                      />
                      <div className="absolute right-4 bottom-4 flex gap-2">
                         {uvtsInput && (
                           <button onClick={() => setUvtsInput('')} className="p-2 bg-white border border-slate-200 text-slate-300 hover:text-slate-500 rounded-full shadow-sm">
                             <X size={14} />
                           </button>
                         )}
                      </div>
                    </div>

                    <button 
                      onClick={async () => {
                        if (!uvtsInput.trim()) return;
                        try {
                          const uvts = JSON.parse(uvtsInput) as UVTSTemplate;
                          if (!uvts.style_name) throw new Error('缺少 style_name');
                          
                          await withLoading('saving', async () => {
                            const newT = await templateService.saveTemplate(
                              uvts.style_name, 
                              `UVTS-${uvts.version} Format`, 
                              uvts
                            );
                            setAdTemplates(prev => [newT, ...prev]);
                            setUvtsInput('');
                            showToast('模板导入并成功保存至后台！', 'success');
                          });
                        } catch (err: any) {
                          showToast(`解析失败: ${err.message}`, 'error');
                        }
                      }}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2"
                    >
                      <Save size={16} /> 保存至海报库 / SAVE TO LIBRARY
                    </button>
                    
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1 bg-blue-600 text-white rounded">
                           <Layout size={10} />
                        </div>
                        <span className="text-[9px] font-black text-blue-700 uppercase tracking-widest">Figma 联动指南</span>
                      </div>
                      <p className="text-[9px] text-blue-600/70 font-medium leading-relaxed">
                        1. 在 Figma 设计稿中选中图层。 <br/>
                        2. 运行海报转换工具，获取标准 UVTS-1.1 JSON。<br/>
                        3. 粘贴至上方并保存，即刻应用于海报编辑器。
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-5 rounded-[2rem] border border-slate-800 relative overflow-hidden group">
                    <h5 className="text-white text-xs font-black uppercase tracking-widest mb-1">FIGMA 格式支持</h5>
                    <p className="text-slate-400 text-[10px] font-medium leading-relaxed">编辑器完全兼容 Figma。导入 SVG 文件即可直接生成具有识别框的海报模板。</p>
                  </div>
                </div>
              </div>
          </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
