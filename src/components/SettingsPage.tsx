import { ErrorFactory } from '@/lib/error/ErrorFactory';
import React, { useState } from 'react';
import { 
  ChevronLeft,
  Settings2, Save, ChevronDown, X
} from 'lucide-react';
import { api } from '@/lib/api';

import { toast } from 'sonner';
import { ErrorLogViewer } from './admin/ErrorLogViewer';
import { AppSettings, User, ApiResponse } from '@/types';
import { 
  useUIStore, useShallow
} from '@/store/useUIStore';
import { useDisclosure } from '@mantine/hooks';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
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

import { usePhotoGallery } from '@/hooks/photo/usePhotoGallery';
import { useSyncMutation, useTasks } from '@/hooks';

const BUTTON_STYLES = {
  primary: "px-5 py-2.5 bg-brand-navy hover:bg-brand-navy/90 text-brand-bg rounded-2xl text-[11px] font-bold uppercase tracking-tight shadow-md active:scale-95 transition-all flex items-center gap-2 justify-center disabled:opacity-50",
  secondary: "px-5 py-2.5 bg-brand-bg border border-brand-navy/10 hover:bg-brand-navy/5 text-brand-navy rounded-2xl text-[11px] font-bold uppercase tracking-tight shadow-sm active:scale-95 transition-all flex items-center gap-2 justify-center disabled:opacity-50",
  accent: "px-5 py-2.5 bg-brand-gold hover:bg-brand-gold/90 text-white rounded-2xl text-[11px] font-bold uppercase tracking-tight shadow-md active:scale-95 transition-all flex items-center gap-2 justify-center disabled:opacity-50",
};

interface SettingsPageProps {
  onClose?: () => void;
}

export function SettingsPage({ onClose }: SettingsPageProps) {
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
    if (file) await uploadLogo(file);
  };

  const performPushSync = async () => { await syncMut('push'); };
  const performPullSync = async () => { await syncMut('pull'); };
  const { data: totalPhotoCount = 0 } = usePhotoCount(undefined);
  const cloudCount = totalPhotoCount;
  const refreshCloudData = async () => { await syncMut('pull'); };
  
  const isSyncing = tasks.some(t => t.name.includes('同步') && t.status === 'running');
  const isMaintenanceRunning = tasks.some(t => (t.name.includes('维护') || t.name.includes('诊断')) && t.status === 'running');
  
  const appLang = useUIStore(s => s.appLang);
  const t = translations[appLang as keyof typeof translations] || translations.en;

  
  const { user, loginWithGoogle, logout } = useAuth();
  const { settings, geminiApiKey, customModel, accessPasscode, updateSettings } = useSettings();
  const setGeminiApiKey = (key: string) => updateSettings({ ...settings, gemini_api_key: key });
  const setAccessPasscode = (code: string) => updateSettings({ ...settings, access_passcode: code });
  const setSettings = (s: AppSettings) => { updateSettings(s as any); };
  const saveSettings = async (s: Partial<AppSettings>) => { await updateSettings(s); };

  const {
      updateTag, updateCategory, addCategory, 
      addManufacturer, updateManufacturer, addTag
  } = useAdminCategory({ update });

  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [manufacturerToDelete, setManufacturerToDelete] = useState<string | null>(null);

  const [isTagDeleteOpen, tagDeleteDialog] = useDisclosure(false);
  const [isCategoryDeleteOpen, categoryDeleteDialog] = useDisclosure(false);
  const [isManufacturerDeleteOpen, manufacturerDeleteDialog] = useDisclosure(false);

  const deleteTag = (id: string) => {
    setTagToDelete(id);
    tagDeleteDialog.open();
  };

  const deleteCategory = (id: string) => {
    setCategoryToDelete(id);
    categoryDeleteDialog.open();
  };

  const deleteManufacturer = (id: string) => {
    setManufacturerToDelete(id);
    manufacturerDeleteDialog.open();
  };

  const { 
      deleteTag: deleteTagRaw, 
      deleteCategory: deleteCategoryRaw, 
      deleteManufacturer: deleteManufacturerRaw 
  } = useAdminCategory({ update });

  const {
    testResult,
    hasChanges, setHasChanges,
    activeTagMenuId, setActiveTagMenuId,
    debouncedSave,
    testConnection,
    togglePin,
    setSettingField,
    uploadLogo
  } = useSettingsLogic({
    user: user || null,
    settings,
    geminiApiKey: geminiApiKey || "",
    saveSettings,
    performPullSync,
    setSettings: (s: AppSettings) => { void updateSettings(s as Partial<AppSettings>); }
  });

  const inputClass = "flex-1 min-w-0 bg-brand-navy/5 border border-brand-navy/10 p-3 rounded-2xl text-sm outline-none focus:border-brand-gold focus:bg-white shadow-inner font-normal tracking-tight placeholder:text-brand-navy/30 text-brand-navy";
  const cardClass = "bg-white rounded-[32px] p-6 shadow-sm border border-brand-navy/10 space-y-4";
  const [activeTab, setActiveTab] = React.useState('sync');

  React.useEffect(() => {
    if (activeScreen === 'ai_settings') setActiveTab('ai');
    if (activeScreen === 'manage') setActiveTab('sync');
    if (activeScreen === 'structure' || activeScreen === 'tags') setActiveTab('assets');
    if (activeScreen === 'settings') setActiveTab('sync');
    if (['tasks', 'history_maintenance', 'error-logs', 'logs', 'diagnostics'].includes(activeScreen)) setActiveTab('status');
  }, [activeScreen]);

  return (
    <div className="fixed inset-0 z-[var(--z-index-max)] bg-brand-bg flex flex-col pt-safe">
      <div className="px-6 py-4 flex items-center justify-between bg-white border-b border-slate-200 sticky top-0 z-10 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center shadow-sm text-white shrink-0">
            <Settings2 size={18} className="stroke-[2.5]" />
          </div>
          <span className="font-black text-lg tracking-tight text-slate-800">
            {appLang === 'zh' ? '系统设置' : 'System Settings'}
          </span>
          {hasChanges && (
            <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2.5 py-1 rounded-full font-bold uppercase tracking-widest animate-pulse">
              {appLang === 'zh' ? '有未保存修改' : 'Unsaved Changes'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button 
             onClick={async () => {
               try {
                 await saveSettings({ ...settings });
                 setHasChanges(false);
                 toast.success('设置已保存');
               } catch (err) {
                 console.error("Save settings failed:", err);
               }
             }}
             className="h-10 px-4 rounded-full shadow-sm bg-brand-gold hover:bg-brand-gold/90 text-white flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 hover:shadow-md cursor-pointer"
             title={appLang === 'zh' ? '保存设置' : 'Save Settings'}
          >
              <Save size={16} />
              <span>{appLang === 'zh' ? '保存' : 'Save'}</span>
          </button>
          
          <button 
            onClick={() => {
              if (onClose) onClose();
              else update({ activeScreen: 'gallery' });
            }} 
            className="w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 shrink-0 border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-100 shadow-sm cursor-pointer"
            title={appLang === 'zh' ? '关闭并返回管理模式' : 'Close and Return'}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar pb-32">
        <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />
        
        <div className="space-y-6">
          {activeTab === 'sync' && (
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
                cardClass={cardClass}
                buttonStyles={BUTTON_STYLES}
              />
            </>
          )}

          {activeTab === 'ai' && (
            <>
              <AISettings 
                geminiApiKey={geminiApiKey || ""}
                setGeminiApiKey={setGeminiApiKey}
                customModel={customModel || ""}
                testConnection={async () => { await testConnection(); }}
                testResult={testResult}
                accessPasscode={accessPasscode || ""}
                setAccessPasscode={setAccessPasscode}
                setSettingField={setSettingField}
                cardClass={cardClass}
                inputClass={inputClass}
              />
              <GeneralSettings 
                settings={settings}
                handleLogoUpload={handleLogoUpload}
                categories={categories}
                tags={tags}
                manufacturers={manufacturers}
                photos={photos}
                setSettingField={setSettingField}
                cardClass={cardClass}
                inputClass={inputClass}
                buttonStyles={BUTTON_STYLES}
              />
            </>
          )}

          {activeTab === 'assets' && (
            <>
              <CategoriesManager 
                categories={categories}
                deleteCategory={deleteCategory}
                updateCategory={async (id, data) => { const r = await updateCategory({ id, updates: data }); return !!r; }}
                addCategory={async (name: string) => { const r = await addCategory(name); if (!r) throw ErrorFactory.wrap(new Error("Failed"), 'addCategory', name); return r; }}
                manufacturers={manufacturers}
                addManufacturer={async (name) => { const r = await addManufacturer(name); if (!r) throw ErrorFactory.wrap(new Error("Failed"), 'addManufacturer', name); return r; }}
                updateManufacturer={async (id, data) => { const r = await updateManufacturer({ id, updates: data }); return !!r; }}
                deleteManufacturer={deleteManufacturer}
                cardClass={cardClass}
                buttonStyles={BUTTON_STYLES}
              />
              <TagsManager 
                tags={tags}
                settings={settings}
                addTag={async (name) => { const r = await addTag(name); if (!r) throw ErrorFactory.wrap(new Error("Failed"), 'addTag', name); return r; }}
                updateTag={async (id, data) => { const r = await updateTag({ id, updates: data }); return !!r; }}
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

          {activeTab === 'status' && (
            <DiagnosticsDashboard />
          )}
        </div>
      </div>
      <ConfirmDialog
        open={isTagDeleteOpen}
        onOpenChange={tagDeleteDialog.toggle}
        title={t.confirmDeleteTagTitle}
        description={t.confirmDeleteTagDesc}
        confirmText={t.deleteBtn}
        variant="destructive"
        onConfirm={async () => { if (tagToDelete) await deleteTagRaw(tagToDelete); }}
      />
      <ConfirmDialog
        open={isCategoryDeleteOpen}
        onOpenChange={categoryDeleteDialog.toggle}
        title={t.confirmDeleteCatTitle}
        description={t.confirmDeleteCatDesc}
        confirmText={t.deleteBtn}
        variant="destructive"
        onConfirm={async () => { if (categoryToDelete) await deleteCategoryRaw(categoryToDelete); }}
      />
      <ConfirmDialog
        open={isManufacturerDeleteOpen}
        onOpenChange={manufacturerDeleteDialog.toggle}
        title={t.confirmDeleteMfrTitle}
        description={t.confirmDeleteMfrTitle}
        confirmText={t.deleteBtn}
        variant="destructive"
        onConfirm={async () => { if (manufacturerToDelete) await deleteManufacturerRaw(manufacturerToDelete); }}
      />
    </div>
  );
};
