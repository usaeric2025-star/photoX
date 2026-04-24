import React, { useState } from 'react';
import { 
  ChevronLeft, X, Cloud, LogOut, RefreshCcw, 
  Trash2, Download, Upload, MessageCircle, 
  Plus, Settings2, Image as ImageIcon, Sparkles, Lock, CloudUpload, CloudDownload
} from 'lucide-react';
import { SubCategory, Tag } from '../types';

interface SettingsScreenProps {
  setActiveScreen: (screen: 'home' | 'add' | 'manage' | 'settings') => void;
  settings: any;
  setSettings: (s: any) => void;
  saveSettings: (s: any) => Promise<boolean>;
  manufacturers: SubCategory[];
  setManufacturers: (m: SubCategory[]) => void;
  tags: Tag[];
  setTags: (t: Tag[]) => void;
  user: any;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  triggerManualSync: () => Promise<void>;
  isSyncing: boolean;
  syncPercent: number;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  setCategories: React.Dispatch<React.SetStateAction<any[]>>;
  categories: any[];
  dbCategories: any[];
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
    setTags([...(tags || []), newTag]);
    setNewTagName('');
  };

  const deleteTag = (id: string) => {
    setTags(prev => prev.filter(t => t.id !== id));
  };

  const setSettingField = (field: string, value: any) => {
    const newSettings = { ...settings, [field]: value };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // Consistent Button Classes
  const primaryBtnClass = "px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-bold shadow-md active:scale-95 transition-all flex items-center gap-2 justify-center disabled:opacity-50";
  const secondaryBtnClass = "px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold shadow-sm active:scale-95 transition-all flex items-center gap-2 justify-center disabled:opacity-50";
  const accentBtnClass = "px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold shadow-md active:scale-95 transition-all flex items-center gap-2 justify-center disabled:opacity-50";
  
  const inputClass = "flex-1 bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner font-medium placeholder:text-slate-400";
  const cardClass = "bg-white rounded-[32px] p-6 shadow-sm border border-slate-200 space-y-4";

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col pt-safe">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3 bg-white shadow-sm">
        <button 
          onClick={() => setActiveScreen('home')} 
          className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors rounded-full active:bg-slate-100"
          id="btn-settings-back"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="font-bold text-lg text-slate-800 flex-1 ml-1 tracking-tight">設定與管理</h2>
        <Settings2 size={20} className="text-slate-300" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 no-scrollbar pb-32">
        
        {/* Logo Section */}
        <div className={cardClass} id="section-logo">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <div className="w-1.5 h-3.5 bg-orange-500 rounded-full"></div>
              品牌 Logo 設定
            </h4>
            <div className="flex items-center gap-5">
                <div className="relative group">
                  {settings?.logo_url ? (
                      <img src={settings.logo_url} className="w-16 h-16 rounded-3xl object-cover shadow-md border-2 border-white" alt="Logo" />
                  ) : (
                      <div className="w-16 h-16 bg-slate-50 rounded-3xl flex flex-col items-center justify-center text-slate-300 shadow-inner border border-slate-100 italic">
                        <ImageIcon size={20} className="mb-1" />
                        <span className="text-[8px]">No Logo</span>
                      </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <label className="relative overflow-hidden block">
                    <span className={secondaryBtnClass}>
                      <Upload size={14} /> 選擇圖片
                    </span>
                    <input 
                      type="file" 
                      onChange={handleLogoUpload} 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      accept="image/*" 
                    />
                  </label>
                  <p className="text-[9px] text-slate-400 font-medium leading-relaxed px-1">建議比例 1:1，將顯示於相簿頂端</p>
                </div>
            </div>
        </div>

        {/* Sync Section Refined */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[32px] p-6 shadow-xl border border-slate-700 space-y-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl -mr-10 -mt-10 group-hover:bg-blue-500/20 transition-all duration-700"></div>
          
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Cloud size={18} className={user ? 'text-blue-400' : 'text-slate-400'} />
              雲端同步管理
            </h4>
            {user && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 rounded-full border border-blue-500/30">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">已連接</span>
              </div>
            )}
          </div>

          {!user ? (
            <button 
              onClick={loginWithGoogle}
              className="w-full py-4 bg-white hover:bg-slate-50 text-slate-900 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-all"
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
              使用 Google 登入帳號
            </button>
          ) : (
            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/10">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} className="w-10 h-10 rounded-full border border-white/20" alt="Avatar" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20">
                    {String(user?.displayName || 'U').charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-bold truncate">{user?.displayName}</p>
                  <p className="text-[9px] text-slate-500 truncate">{user?.email}</p>
                </div>
                <button 
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                  title="登出"
                >
                  <LogOut size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={performPushSync}
                  disabled={isSyncing}
                  className="bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 active:scale-95 transition-all"
                >
                  <CloudUpload size={16} /> 上傳備份
                </button>
                <button 
                  onClick={performPullSync}
                  disabled={isSyncing}
                  className="bg-slate-700 hover:bg-slate-600 text-white py-3.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 active:scale-95 transition-all"
                >
                  <CloudDownload size={16} /> 下載數據
                </button>
              </div>

              <div className="text-center p-2 bg-black/20 rounded-xl border border-white/5">
                <p className="text-[9px] text-slate-400">
                  雲端照片: <span className="text-white">{cloudCount || 0}</span> | 
                  最後同步: <span className="text-white">{lastSyncTime ? new Date(lastSyncTime).toLocaleString('zh-TW', { hour12: false }) : '無'}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* WhatsApp Section */}
        <div className={cardClass} id="section-whatsapp">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <div className="w-1.5 h-3.5 bg-[#25D366] rounded-full"></div>
              WhatsApp 聯繫設定
            </h4>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 flex items-center gap-2">
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  主要號碼 (+60...)
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="例如: 60123456789"
                    className={inputClass}
                    value={settings?.whatsapp_1 || ''}
                    onChange={(e) => setSettingField('whatsapp_1', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 flex items-center gap-2">
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  備用號碼
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="例如: 60123456789"
                    className={inputClass}
                    value={settings?.whatsapp_2 || ''}
                    onChange={(e) => setSettingField('whatsapp_2', e.target.value)}
                  />
                </div>
              </div>
            </div>
        </div>

        {/* AI & Password Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={cardClass} id="section-ai">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Sparkles size={16} className="text-purple-500" />
                AI 智能設定
              </h4>
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase ml-1">Gemini API Key</p>
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
                  <p className="text-[9px] font-bold text-slate-400 uppercase ml-1">自定義模型名稱</p>
                  <input 
                    type="text" 
                    placeholder="指定模型 (選填)"
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
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Lock size={16} className="text-orange-500" />
                Staff 密碼
              </h4>
              <p className="text-[10px] text-slate-400 leading-relaxed font-bold">
                解鎖查看內部隱密資訊。
              </p>
              <input 
                type="password" 
                placeholder="設定密碼..."
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
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <div className="w-1.5 h-3.5 bg-blue-500 rounded-full"></div>
              廠商名單管理
            </h3>
            <span className="text-[10px] text-slate-400 font-bold">{(manufacturers || []).length} 筆</span>
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="新增廠商..."
              className={inputClass}
              value={newSubName}
              onChange={(e) => setNewSubName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addManufacturer()}
            />
            <button onClick={addManufacturer} className={accentBtnClass}>
              <Plus size={16} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-[28px] border border-slate-100 shadow-inner min-h-[48px]">
            {(manufacturers || []).map(sub => (
              <div key={sub.id} className="bg-white border border-slate-200 pl-3 pr-2 py-1 rounded-full flex items-center gap-2 shadow-sm animate-in fade-in zoom-in duration-300">
                <span className="text-[11px] font-bold text-slate-700">{sub.name}</span>
                <button onClick={() => deleteManufacturer(sub.id)} className="text-slate-300 hover:text-red-500 p-1 rounded-full"><X size={14} /></button>
              </div>
            ))}
          </div>
        </section>

        {/* Tags Section */}
        <section className={cardClass} id="section-tags">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <div className="w-1.5 h-3.5 bg-purple-500 rounded-full"></div>
              風格標籤管理
            </h3>
            <span className="text-[10px] text-slate-400 font-bold">{(tags || []).length} 筆</span>
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="輸入標籤..."
              className={inputClass}
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
            />
            <button onClick={addTag} className={primaryBtnClass}>
              <Plus size={16} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-[28px] border border-slate-100 shadow-inner min-h-[48px]">
            {(tags || []).map(tag => (
              <div key={tag.id} className="bg-white border border-slate-200 pl-3 pr-2 py-1 rounded-full flex items-center gap-2 shadow-sm animate-in fade-in zoom-in duration-300">
                <span className="text-[11px] font-bold text-slate-700">#{tag.name}</span>
                <button onClick={() => deleteTag(tag.id)} className="text-slate-300 hover:text-red-500 p-1 rounded-full"><X size={14} /></button>
              </div>
            ))}
          </div>
        </section>

        {/* Export Data */}
        <div className={cardClass}>
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Download size={16} className="text-slate-600" />
              本地數據備份匯出
            </h4>
            <div className="flex gap-3">
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
                className={primaryBtnClass + " flex-1"}
              >
                匯出 JSON 檔案
              </button>
              <label className={secondaryBtnClass + " flex-1 cursor-pointer"}>
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
                        alert('數據已匯入成功！');
                      } catch (err) {
                        alert('匯入失敗，格式錯誤');
                      }
                    };
                    reader.readAsText(file);
                  }}
                />
                導入備份 JSON
              </label>
            </div>
        </div>

      </div>
    </div>
  );
};
