import React, { useState } from 'react';
import { 
  ChevronLeft, X, Cloud, LogOut, RefreshCcw, 
  Trash2, Download, Upload, MessageCircle, 
  Plus, Settings2, Image as ImageIcon, Sparkles, Lock, CloudUpload, CloudDownload,
  User, Heart, Smile, Layout, ChevronRight
} from 'lucide-react';
import { SubCategory, Tag, DB_Category } from '../types';
import { motion, AnimatePresence } from 'motion/react';

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
  dbCategories: DB_Category[];
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

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  setActiveScreen,
  settings,
  setSettings,
  saveSettings,
  manufacturers,
  setManufacturers,
  tags,
  setTags,
  user,
  loginWithGoogle,
  logout,
  triggerManualSync,
  isSyncing,
  syncPercent,
  handleLogoUpload,
  setCategories,
  categories,
  dbCategories,
  performPushSync,
  performPullSync,
  cloudCount,
  lastSyncTime,
  geminiApiKey,
  setGeminiApiKey,
  customModel,
  setCustomModel,
  internalPassword,
  setInternalPassword,
  photos,
  setPhotos
}) => {
  const [newSubName, setNewSubName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [showCatOverview, setShowCatOverview] = useState(false);

  const addManufacturer = () => {
    if (!newSubName.trim()) return;
    const newMfrId = crypto.randomUUID();
    const newMfr = {
      id: newMfrId,
      name: newSubName.trim(),
      aliases: [newSubName.trim()]
    };
    setManufacturers([...(manufacturers || []), newMfr]);
    setNewSubName('');
    setCategories(prev => prev.map(c => ({
      ...c,
      subcategories: [...(c.subcategories || []), { ...newMfr }]
    })));
  };

  const deleteManufacturer = (id: string) => {
    setManufacturers(prev => prev.filter(m => m.id !== id));
    setCategories(prev => prev.map(c => ({
      ...c,
      subcategories: (c.subcategories || []).filter(sub => sub.id !== id)
    })));
  };

  const addTag = () => {
    if (!newTagName.trim()) return;
    const newTag: Tag = {
      id: crypto.randomUUID(),
      name: newTagName.trim(),
      aliases: [newTagName.trim()]
    };
    setTags(prev => [...(prev || []), newTag]);
    setNewTagName('');
  };

  const deleteTag = (id: string) => {
    setTags(prev => (prev || []).filter(t => t.id !== id));
  };

  const setSettingField = (field: string, value: any) => {
    const newSettings = { ...settings, [field]: value };
    setSettings(newSettings);
    saveSettings({
      ...newSettings,
      categories,
      tags,
      manufacturers
    });
  };

  // Consistent Button Classes
  const primaryBtnClass = "px-5 py-2.5 bg-[#1D3557] hover:bg-[#1D3557]/90 text-[#FDFAF6] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all flex items-center gap-2 justify-center disabled:opacity-50";
  const secondaryBtnClass = "px-5 py-2.5 bg-[#FDFAF6] border border-[#1D3557]/20 hover:bg-[#1D3557]/5 text-[#1D3557] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all flex items-center gap-2 justify-center disabled:opacity-50";
  const accentBtnClass = "px-5 py-2.5 bg-[#D4A853] hover:bg-[#D4A853]/90 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all flex items-center gap-2 justify-center disabled:opacity-50";
  
  const inputClass = "flex-1 bg-[#1D3557]/5 border border-[#1D3557]/10 p-3 rounded-2xl text-[11px] outline-none focus:border-[#D4A853] focus:bg-white transition-all shadow-inner font-bold tracking-tight placeholder:text-[#1D3557]/30 text-[#1D3557]";
  const cardClass = "bg-white rounded-[32px] p-6 shadow-sm border border-[#1D3557]/10 space-y-4";

  return (
    <div className="fixed inset-0 z-[100] bg-[#FDFAF6] flex flex-col pt-safe">
      {/* Header */}
      <div className="px-6 py-4 flex items-center gap-3 bg-[#FDFAF6] sticky top-0 z-10">
        <button 
          onClick={() => setActiveScreen('home')} 
          className="p-2 -ml-2 text-[#1D3557]/50 hover:text-[#1D3557] transition-colors rounded-full active:bg-[#1D3557]/5"
          id="btn-settings-back"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="font-black text-xs text-[#1D3557] border border-[#1D3557]/10 px-3 py-1 rounded-xl bg-white shadow-sm inline-block italic leading-none uppercase tracking-widest flex-1 ml-1">Settings & Management</h2>
        <Settings2 size={20} className="text-[#1D3557]/20" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 no-scrollbar pb-32">
        
        {/* Logo Section */}
        <div className={cardClass} id="section-logo">
            <h4 className="font-black text-[#1D3557] text-[10px] uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-3.5 bg-[#D4A853] rounded-full"></div>
              Logo Setting
            </h4>
            <div className="flex items-center gap-5">
                <div className="relative group">
                  {settings?.logo_url ? (
                      <img src={settings.logo_url} className="w-16 h-16 rounded-3xl object-cover shadow-md border-2 border-white p-1 bg-white" alt="Logo" />
                  ) : (
                      <div className="w-16 h-16 bg-[#1D3557]/5 rounded-3xl flex flex-col items-center justify-center text-[#1D3557]/20 shadow-inner border border-[#1D3557]/10 italic">
                        <ImageIcon size={20} className="mb-1" />
                        <span className="text-[8px]">No Logo</span>
                      </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <label className="relative overflow-hidden block">
                    <span className={secondaryBtnClass}>
                      <Upload size={14} /> Upload Logo
                    </span>
                    <input 
                      type="file" 
                      onChange={handleLogoUpload} 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      accept="image/*" 
                    />
                  </label>
                  <p className="text-[9px] text-[#1D3557]/40 font-black uppercase tracking-tighter leading-relaxed px-1">Ratio 1:1 recommended</p>
                </div>
            </div>
        </div>

        {/* Sync Section Refined */}
        <div className="bg-[#1D3557] rounded-[32px] p-6 shadow-xl border border-white/5 space-y-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4A853]/10 blur-3xl -mr-10 -mt-10 group-hover:bg-[#D4A853]/20 transition-all duration-700"></div>
          
          <div className="flex items-center justify-between">
            <h4 className="font-black text-white text-[10px] uppercase tracking-widest flex items-center gap-2">
              <Cloud size={18} className={user ? 'text-[#D4A853]' : 'text-white/30'} />
              Cloud Storage Management
            </h4>
            {user && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#D4A853]/20 rounded-full border border-[#D4A853]/30">
                <div className="w-1.5 h-1.5 bg-[#D4A853] rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-[#D4A853] uppercase tracking-wider">Connected</span>
              </div>
            )}
          </div>

          {!user ? (
            <button 
              onClick={loginWithGoogle}
              className="w-full py-4 bg-white hover:bg-[#FDFAF6] text-[#1D3557] rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-all"
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
              Sign in with Google
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
                  <CloudUpload size={16} /> Backup
                </button>
                <button 
                  onClick={performPullSync}
                  disabled={isSyncing}
                  className="bg-white/10 hover:bg-white/20 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 active:scale-95 transition-all placeholder:border-white/20"
                >
                  <CloudDownload size={16} /> Restore
                </button>
              </div>

              <div className="text-center p-2 bg-black/20 rounded-xl border border-white/5">
                <p className="text-[10px] text-white/40 uppercase tracking-widest leading-loose">
                  Cloud: <span className="text-white font-black">{cloudCount !== null ? cloudCount : '---'} Pcs</span> | 
                  Sync: <span className="text-white font-black">{lastSyncTime ? new Date(lastSyncTime).toLocaleString('en-US', { hour12: false }) : 'N/A'}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* WhatsApp Section */}
        <div className={cardClass} id="section-whatsapp">
            <h4 className="font-black text-[#1D3557] text-[10px] uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-3.5 bg-[#25D366] rounded-full"></div>
              WhatsApp Contacts
            </h4>
            <div className="space-y-6">
              {/* WhatsApp 1 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 pl-1">
                    <User size={12} className="text-[#1D3557]/30" />
                    <label className="text-[10px] font-black text-[#1D3557]/40 uppercase tracking-widest leading-none pt-0.5">
                        Contact Person A <Heart size={10} className="inline-block text-red-400 animate-pulse" />
                    </label>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Name (e.g. John)"
                    className={inputClass}
                    value={settings?.whatsapp_1_name || ''}
                    onChange={(e) => setSettingField('whatsapp_1_name', e.target.value)}
                  />
                  <input 
                    type="text" 
                    placeholder="Number: 60123456789"
                    className={`${inputClass} flex-[1.5]`}
                    value={settings?.whatsapp_1 || ''}
                    onChange={(e) => setSettingField('whatsapp_1', e.target.value)}
                  />
                </div>
              </div>

              {/* WhatsApp 2 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 pl-1">
                    <User size={12} className="text-slate-400" />
                    <label className="text-[10px] font-black text-[#1D3557]/40 uppercase tracking-widest leading-none pt-0.5">
                        Contact Person B <Smile size={10} className="inline-block text-[#D4A853]" />
                    </label>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Name (e.g. Mary)"
                    className={inputClass}
                    value={settings?.whatsapp_2_name || ''}
                    onChange={(e) => setSettingField('whatsapp_2_name', e.target.value)}
                  />
                  <input 
                    type="text" 
                    placeholder="Number: 60123456789"
                    className={`${inputClass} flex-[1.5]`}
                    value={settings?.whatsapp_2 || ''}
                    onChange={(e) => setSettingField('whatsapp_2', e.target.value)}
                  />
                </div>
              </div>
            </div>
        </div>

        {/* Category Overview */}
        <div className={cardClass} id="section-categories-view">
            <button 
                onClick={() => setShowCatOverview(!showCatOverview)}
                className="w-full flex items-center justify-between group"
            >
                <h4 className="font-black text-[#1D3557] text-[10px] uppercase tracking-widest flex items-center gap-2">
                    <Layout size={16} className="text-[#1D3557]" />
                    Category Overview
                </h4>
                <motion.div animate={{ rotate: showCatOverview ? 90 : 0 }}>
                    <ChevronRight size={18} className="text-[#1D3557]/20 group-hover:text-[#1D3557] transition-colors" />
                </motion.div>
            </button>
            
            <AnimatePresence>
                {showCatOverview && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-3 pt-2"
                    >
                        <p className="text-[10px] text-[#1D3557]/40 font-black uppercase tracking-tight bg-[#1D3557]/5 p-2 rounded-xl italic">
                            Structure is derived from cloud configuration (Read-only).
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {dbCategories.map(cat => (
                                <div key={cat.code} className="p-3 bg-[#FDFAF6] border border-[#1D3557]/10 rounded-2xl shadow-sm hover:border-[#D4A853] transition-all">
                                    <p className="text-[11px] font-black text-[#1D3557] uppercase tracking-tight">{cat.zh}</p>
                                    <p className="text-[8px] text-[#1D3557]/40 font-black uppercase truncate tracking-widest">{cat.code}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* AI & Password Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={cardClass} id="section-ai">
              <h4 className="font-black text-[#1D3557] text-[10px] uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={16} className="text-[#D4A853]" />
                AI Smart Setup
              </h4>
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-[#1D3557]/40 uppercase ml-1 tracking-widest">Gemini API Key</p>
                  <input 
                    type="password" 
                    placeholder="Enter API Key..."
                    className={`${inputClass} font-mono`}
                    value={geminiApiKey}
                    onChange={(e) => {
                      setGeminiApiKey(e.target.value);
                      localStorage.setItem('gemini_api_key_safe', obfuscateKey(e.target.value));
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-[#1D3557]/40 uppercase ml-1 tracking-widest">Custom Model</p>
                  <input 
                    type="text" 
                    placeholder="e.g. gemini-2.0-flash"
                    className={`${inputClass} font-mono`}
                    value={customModel}
                    onChange={(e) => {
                      setCustomModel(e.target.value);
                      localStorage.setItem('ai_custom_model', e.target.value);
                    }}
                  />
                </div>
              </div>
          </div>

          <div className={cardClass} id="section-password">
              <h4 className="font-black text-[#1D3557] text-[10px] uppercase tracking-widest flex items-center gap-2">
                <Lock size={16} className="text-[#D4A853]" />
                Staff Password
              </h4>
              <p className="text-[10px] text-[#1D3557]/40 font-black uppercase tracking-tight leading-relaxed">
                Required for internal visibility actions.
              </p>
              <input 
                type="password" 
                placeholder="Set password..."
                className={`${inputClass} font-mono tracking-widest`}
                value={internalPassword}
                onChange={(e) => {
                  setInternalPassword(e.target.value);
                  localStorage.setItem('internal_password', e.target.value);
                }}
              />
          </div>
        </div>

        {/* Manufacturers Section */}
        <section className={cardClass} id="section-manufacturers">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-[#1D3557] text-[10px] uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-3.5 bg-[#1D3557] rounded-full"></div>
              Manufacturers
            </h3>
            <span className="text-[10px] text-[#1D3557]/40 font-black uppercase">{(manufacturers || []).length} Items</span>
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Add Manufacturer..."
              className={inputClass}
              value={newSubName}
              onChange={(e) => setNewSubName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addManufacturer()}
            />
            <button onClick={addManufacturer} className={accentBtnClass}>
              <Plus size={16} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 p-3 bg-[#1D3557]/5 rounded-[28px] border border-[#1D3557]/10 shadow-inner min-h-[48px]">
            {(manufacturers || []).map(sub => (
              <div key={sub.id} className="bg-white border border-[#1D3557]/10 pl-3 pr-2 py-1 rounded-full flex items-center gap-2 shadow-sm animate-in fade-in zoom-in duration-300">
                <span className="text-[11px] font-black text-[#1D3557] uppercase tracking-tight">{sub.name}</span>
                <button onClick={() => deleteManufacturer(sub.id)} className="text-[#1D3557]/20 hover:text-[#D4A853] p-1 rounded-full"><X size={14} /></button>
              </div>
            ))}
          </div>
        </section>

        {/* Tags Section */}
        <section className={cardClass} id="section-tags">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-[#1D3557] text-[10px] uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-3.5 bg-[#D4A853] rounded-full"></div>
              Common Tags
            </h3>
            <span className="text-[10px] text-[#1D3557]/40 font-black uppercase">{(tags || []).length} Items</span>
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Add Tag (e.g. Clear Stock)..."
              className={inputClass}
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
            />
            <button onClick={addTag} className={accentBtnClass}>
              <Plus size={16} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 p-3 bg-[#1D3557]/5 rounded-[28px] border border-[#1D3557]/10 shadow-inner min-h-[48px]">
            {(tags || []).map(tag => (
              <div key={tag.id} className="bg-white border border-[#1D3557]/10 pl-3 pr-2 py-1 rounded-full flex items-center gap-2 shadow-sm animate-in fade-in zoom-in duration-300">
                <span className="text-[11px] font-black text-[#1D3557] uppercase tracking-tight">{tag.name}</span>
                <button onClick={() => deleteTag(tag.id)} className="text-[#1D3557]/20 hover:text-[#D4A853] p-1 rounded-full"><X size={14} /></button>
              </div>
            ))}
          </div>
        </section>

        {/* Export Data */}
        <div className={cardClass}>
            <h4 className="font-black text-[#1D3557] text-[10px] uppercase tracking-widest flex items-center gap-2">
              <Download size={16} className="text-[#1D3557]" />
              Data Backup & Restore
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
                Export JSON
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
                        alert('Data imported successfully!');
                      } catch (err) {
                        alert('Import failed, incorrect format');
                      }
                    };
                    reader.readAsText(file);
                  }}
                />
                Import JSON
              </label>
            </div>
        </div>

      </div>
    </div>
  );
};
