import React from 'react';
import { 
  ChevronLeft,
  Settings2, Save, ChevronDown
} from 'lucide-react';
import { useErrorHandler } from '@/hooks';
import { toast } from '@/lib/ui/toast';
import { ErrorLogViewer } from './admin/ErrorLogViewer';
import { AppSettings, User, ApiResponse } from '@/types';
import { 
  useUIStore, useShallow
} from '@/store/useUIStore';
import { 
  useCategories, useTags, useManufacturers, usePhotos,
  useAdminCategory, useAuth, useSettings, usePhotoCount
} from '@/hooks';
import { useSettingsLogic } from './settings/useSettingsLogic';
import { SettingsTabs } from './settings/SettingsTabs';
import { GeneralSettings } from './settings/GeneralSettings';
import { AISettings } from './settings/AISettings';
import { SyncSettings } from './settings/SyncSettings';
import { TagsManager } from './settings/TagsManager';
import { CategoriesManager } from './settings/CategoriesManager';
import { DiagnosticsDashboard } from './admin/DiagnosticsDashboard';
import { translations } from '@/lib/translations';

import { usePhotoGallery } from '@/features/photos/usePhotoGallery';
import { useSyncMutation, useTasks } from '@/hooks';

const BUTTON_STYLES = {
  primary: "px-5 py-2.5 bg-brand-navy hover:bg-brand-navy/90 text-brand-bg rounded-2xl text-[11px] font-bold uppercase tracking-tight shadow-md active:scale-95 transition-all flex items-center gap-2 justify-center disabled:opacity-50",
  secondary: "px-5 py-2.5 bg-brand-bg border border-brand-navy/10 hover:bg-brand-navy/5 text-brand-navy rounded-2xl text-[11px] font-bold uppercase tracking-tight shadow-sm active:scale-95 transition-all flex items-center gap-2 justify-center disabled:opacity-50",
  accent: "px-5 py-2.5 bg-brand-gold hover:bg-brand-gold/90 text-white rounded-2xl text-[11px] font-bold uppercase tracking-tight shadow-md active:scale-95 transition-all flex items-center gap-2 justify-center disabled:opacity-50",
};

export function SettingsScreen() {
  const update = useUIStore((s) => s.update);
  const activeScreen = useUIStore((s) => s.activeScreen);
  
  const { photos } = usePhotoGallery();
  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();
  const { data: manufacturers = [] } = useManufacturers();
  const { tasks } = useTasks();
  const { mutateAsync: syncMut } = useSyncMutation();

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.info("正在上传 Logo...", { duration: 2000 });
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const resp = await fetch('/api/upload-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data,
            fileKey: `settings/logo_${Date.now()}.webp`,
            contentType: file.type
          })
        });
        const res = await resp.json();
        if (res.success && res.data.publicUrl) {
          setSettingField('logo_url', res.data.publicUrl);
          toast.success("Logo 上传成功");
        } else {
          handleError(new Error(res.error || 'Upload failed'), 'Logo 上传失败');
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      handleError(err, 'Logo 上传失败');
    }
  };

  const performPushSync = async () => { await syncMut('push'); };
  const performPullSync = async () => { await syncMut('pull'); };
  const { data: totalPhotoCount = 0 } = usePhotoCount();
  const cloudCount = totalPhotoCount;
  const refreshCloudData = async () => { await syncMut('pull'); };
  
  const isSyncing = tasks.some(t => t.name.includes('同步') && t.status === 'running');
  const isMaintenanceRunning = tasks.some(t => (t.name.includes('维护') || t.name.includes('诊断')) && t.status === 'running');
  const onRunMaintenance = async () => {
    await handleHealthCheck(photos);
  };
  const t = translations.zh;

  const { handleError } = useErrorHandler();
  const { user, loginWithGoogle, logout } = useAuth();
  const { settings, geminiApiKey, customModel, accessPasscode, updateSettings } = useSettings();
  const setGeminiApiKey = (key: string) => updateSettings({ ...settings, gemini_api_key: key });
  const setCustomModel = (model: string) => updateSettings({ ...settings, custom_model: model });
  const setAccessPasscode = (code: string) => updateSettings({ ...settings, access_passcode: code });
  const setSettings = (s: AppSettings) => { updateSettings(s as any); };
  const saveSettings = async (s: Partial<AppSettings>) => { await updateSettings(s); };

  const {
      updateTag, deleteTag, updateCategory, deleteCategory, addCategory, 
      addManufacturer, updateManufacturer, deleteManufacturer, addTag
  } = useAdminCategory({ update });

  const {
    testResult,
    hasChanges, setHasChanges,
    activeTagMenuId, setActiveTagMenuId,
    debouncedSave,
    testConnection,
    handleDeduplicate,
    handleHealthCheck,
    togglePin,
    setSettingField
  } = useSettingsLogic({
    user: user || null,
    settings,
    geminiApiKey,
    customModel,
    saveSettings,
    performPullSync,
    setSettings: (s: AppSettings) => { void updateSettings(s as Partial<AppSettings>); }
  });

  const inputClass = "flex-1 min-w-0 bg-brand-navy/5 border border-brand-navy/10 p-3 rounded-2xl text-sm outline-none focus:border-brand-gold focus:bg-white shadow-inner font-normal tracking-tight placeholder:text-brand-navy/30 text-brand-navy";
  const cardClass = "bg-white rounded-[32px] p-6 shadow-sm border border-brand-navy/10 space-y-4";
  const [activeTab, setActiveTab] = React.useState('cloud');

  React.useEffect(() => {
    if (activeScreen === 'ai_settings') setActiveTab('app');
    if (activeScreen === 'manage') setActiveTab('cloud');
    if (activeScreen === 'structure' || activeScreen === 'tags') setActiveTab('content');
    if (activeScreen === 'settings') setActiveTab('cloud');
  }, [activeScreen]);

  return (
    <div className="fixed inset-0 z-[500] bg-brand-bg flex flex-col pt-safe">
      <div className="px-6 py-4 flex items-center gap-3 bg-brand-bg sticky top-0 z-10">
        <button 
          onClick={() => update({ activeScreen: 'home' })} 
          className="p-2 -ml-2 text-brand-navy/50 hover:text-brand-navy transition-colors rounded-full active:bg-brand-navy/5"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="font-black text-xs text-brand-navy border border-brand-navy/10 px-3 py-1 rounded-xl bg-white shadow-sm inline-block italic leading-none uppercase tracking-widest flex-1 ml-1">系统设置 / System Settings</h2>
        <button 
           onClick={async () => {
             if (hasChanges) {
               await saveSettings({ ...settings });
               setHasChanges(false);
               toast.success("保存成功 / Saved successfully");
             } else {
               toast.info("没有更改需要保存 / No changes to save");
             }
           }}
           className={`p-2 rounded-lg shadow-md active:scale-95 transition-all flex items-center justify-center ${hasChanges ? 'bg-brand-gold hover:bg-brand-gold/90 text-white' : 'bg-brand-navy hover:bg-brand-navy/90 text-white'}`}
        >
            <Save size={16} />
        </button>
        <Settings2 size={20} className="text-brand-navy/20" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar pb-32">
        <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />
        
        <div className="space-y-6">
          {activeTab === 'cloud' && (
            <>
              <SyncSettings 
                user={user || null}
                loginWithGoogle={loginWithGoogle}
                logout={logout}
                performPushSync={async () => { await performPushSync(); return { success: true, data: null } as ApiResponse<null>; }}
                performPullSync={async () => { await performPullSync(); return { success: true, data: null } as ApiResponse<null>; }}
                refreshCloudData={refreshCloudData}
                cloudCount={cloudCount}
                isSyncing={isSyncing}
                photos={photos}
                categories={categories}
                tags={tags}
                manufacturers={manufacturers}
                handleDeduplicate={handleDeduplicate}
                cardClass={cardClass}
                buttonStyles={BUTTON_STYLES}
              />
              <ErrorLogViewer />
            </>
          )}

          {activeTab === 'app' && (
            <>
              <GeneralSettings 
                settings={settings}
                handleLogoUpload={handleLogoUpload}
                categories={categories}
                tags={tags}
                manufacturers={manufacturers}
                photos={photos}
                onHealthCheck={handleHealthCheck}
                setSettingField={setSettingField}
                cardClass={cardClass}
                inputClass={inputClass}
                buttonStyles={BUTTON_STYLES}
              />
              <AISettings 
                geminiApiKey={geminiApiKey}
                setGeminiApiKey={setGeminiApiKey}
                customModel={customModel}
                setCustomModel={setCustomModel}
                testConnection={testConnection}
                testResult={testResult}
                accessPasscode={accessPasscode}
                setAccessPasscode={setAccessPasscode}
                setSettingField={setSettingField}
                cardClass={cardClass}
                inputClass={inputClass}
              />
            </>
          )}

          {activeTab === 'content' && (
            <>
              <CategoriesManager 
                categories={categories}
                deleteCategory={deleteCategory}
                updateCategory={async (id, data) => { const r = await updateCategory(id, data); return !!r; }}
                addCategory={async (name: string) => { const r = await addCategory(name); if (!r) throw new Error("Failed"); return r; }}
                manufacturers={manufacturers}
                addManufacturer={async (name) => { const r = await addManufacturer(name); if (!r) throw new Error("Failed"); return r; }}
                updateManufacturer={async (id, data) => { const r = await updateManufacturer(id, data); return !!r; }}
                deleteManufacturer={deleteManufacturer}
                cardClass={cardClass}
                buttonStyles={BUTTON_STYLES}
              />
              <TagsManager 
                tags={tags}
                settings={settings}
                addTag={async (name) => { const r = await addTag(name); if (!r) throw new Error("Failed"); return r; }}
                updateTag={async (id, data) => { const r = await updateTag(id, data); return !!r; }}
                activeTagMenuId={activeTagMenuId}
                setActiveTagMenuId={setActiveTagMenuId}
                deleteTag={deleteTag}
                togglePin={togglePin}
                setSettings={setSettings}
                setHasChanges={setHasChanges}
                debouncedSave={debouncedSave}
                cardClass={cardClass}
                buttonStyles={BUTTON_STYLES}
              />
            </>
          )}

          {activeTab === 'health' && (
            <DiagnosticsDashboard />
          )}
        </div>
      </div>
    </div>
  );
};
