import { logger } from '#lib/logger.js';
import { useAppRouter } from '#lib/router/index.js';
import { useAppQuery as useQuery } from '#lib/query/index.js';
import { useAuth } from '#lib/store/index.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import React, { useState, Suspense } from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { api } from '#lib/api.js';

import { showToast } from '#lib/ui/toast.js';
import { Task } from '#lib/task-queue/types.js';
import { AppSettings, User, ApiResponse, Category, Manufacturer, Tag } from '#src/types/index.js';
import { useUI, UIStoreState } from '#lib/store/index.js';
import { useSettingsManagement } from '#src/hooks/settings/useSettingsManagement.js';
import { ConfirmDialog } from '#src/components/ui/ConfirmDialog.js';
import { 
  useCategories, useTags, useManufacturers,
  useAdminCategory, useSettings
} from '#src/hooks/index.js';
import { useSettingsLogic } from '#src/hooks/index.js';
import { SettingsTabs } from './SettingsTabs.js';
import { SettingsHeader } from './SettingsHeader.js';
import { translations } from '#src/locales/index.js';
import { LoadingScreen } from '#src/components/ui/LoadingScreen.js';
import { useFormSubmit } from '#lib/forms/useFormSubmit.js';
import * as v from 'valibot';

import { useSyncMutation } from '#src/hooks/index.js';
import { useStore } from '#lib/store/index.js';
import { taskStore } from '#src/services/task/taskService.js';

const GeneralSettings = React.lazy(() => import('./GeneralSettings.js').then(m => ({ default: m.GeneralSettings })));
const AISettings = React.lazy(() => import('./AISettings.js').then(m => ({ default: m.AISettings })));
const TagsContainer = React.lazy(() => import('./TagsContainer.js').then(m => ({ default: m.TagsContainer })));
const AssetManagementContainer = React.lazy(() => import('./AssetManagementContainer.js').then(m => ({ default: m.AssetManagementContainer })));
const DiagDashboard = React.lazy(() => import('#src/features/diagnostics/DiagDashboard.js').then(m => ({ default: m.DiagDashboard })));


const BUTTON_STYLES = {
  primary: "px-5 py-2.5 bg-brand-navy hover:bg-brand-navy/90 text-brand-bg rounded-2xl text-[11px] font-bold uppercase tracking-tight shadow-md active:scale-95 transition-all flex items-center gap-2 justify-center disabled:opacity-50",
  secondary: "px-5 py-2.5 bg-brand-bg border border-brand-navy/10 hover:bg-brand-navy/5 text-brand-navy rounded-2xl text-[11px] font-bold uppercase tracking-tight shadow-sm active:scale-95 transition-all flex items-center gap-2 justify-center disabled:opacity-50",
  accent: "px-5 py-2.5 bg-brand-gold hover:bg-brand-gold/90 text-white rounded-2xl text-[11px] font-bold uppercase tracking-tight shadow-md active:scale-95 transition-all flex items-center gap-2 justify-center disabled:opacity-50",
};

interface SettingsPageProps {
  onClose?: () => void;
}

export function SettingsPage({ onClose }: SettingsPageProps) {
  const patch = useUI((s: UIStoreState) => s.patch);
  const { navigate, route } = useAppRouter();
  
  const { categories = [] } = useCategories();
  const { tags = [] } = useTags();
  const { manufacturers = [] } = useManufacturers();

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadLogo(file);
  };
  
  const isMaintenanceRunning = useStore(taskStore, s => Array.from(s.tasks.values()).some(t => (t.label.includes('维护') || t.label.includes('诊断')) && t.state?.status === 'processing'));
  
  const appLang = useUI(s => s.appLang);
  const t = translations[appLang as keyof typeof translations] || translations.en;

  const { user, signIn, signOut } = useAuth();
  const { settings, agnesApiKey, accessPasscode, updateSettings } = useSettings();
  const setAgnesApiKey = (key: string) => updateSettings({ ...settings, agnesApiKey: key });
  const setAccessPasscode = (code: string) => updateSettings({ ...settings, accessPasscode: code });
  const setSettings = (s: AppSettings) => { updateSettings(s); };
  const saveSettings = async (s: Partial<AppSettings>) => { await updateSettings(s); };

  const {
      deleteTag,
      deleteCategory,
      deleteManufacturer,
      updateTag, updateCategory, addCategory, 
      addManufacturer, updateManufacturer, addTag
  } = useSettingsManagement();

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
    agnesApiKey: String(agnesApiKey || ""),
    saveSettings,
    performPullSync: async () => {},
    setSettings: (s: AppSettings) => { void updateSettings(s as Partial<AppSettings>); }
  });

  const inputClass = "flex-1 min-w-0 bg-brand-navy/5 border border-brand-navy/10 p-3 rounded-2xl text-sm outline-none focus:border-brand-gold focus:bg-white shadow-inner font-normal tracking-tight placeholder:text-brand-navy/30 text-brand-navy";
  const cardClass = "bg-white rounded-[32px] p-6 shadow-sm border border-brand-navy/10 space-y-4";
  const initialTab = (() => {
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    if (pathname.startsWith('/admin/diagnose') || 
        pathname.startsWith('/admin/error-logs') || 
        pathname.startsWith('/admin/tasks')) {
      return 'status';
    }
    return 'general';
  })();
  const [activeTab, setActiveTab] = React.useState(initialTab);
  const [loadedTabs, setLoadedTabs] = React.useState<string[]>(['general', initialTab]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (!loadedTabs.includes(tabId)) {
      setLoadedTabs(prev => [...prev, tabId]);
    }
  };

  const { submit: runSaveSettings, isLoading: isSavingSettings } = useFormSubmit({
    schema: v.partial(v.object({
      appName: v.string(),
      logoUrl: v.string(),
      pinnedTags: v.array(v.string()),
      hotTagsCount: v.number(),
      hotTagThreshold: v.number(),
      agnesApiKey: v.string(),
      whatsapp1Name: v.string(),
      whatsapp1: v.string(),
      whatsapp2Name: v.string(),
      whatsapp2: v.string(),
      facebook: v.string(),
      instagram: v.string(),
      accessPasscode: v.string(),
    })),
    mutationFn: async (s: Partial<AppSettings>) => {
      await saveSettings(s);
      return true;
    },
    onSuccess: () => {
      setHasChanges(false);
    },
    successMessage: appLang === 'zh' ? '設定已儲存' : 'Settings saved',
    errorMessage: appLang === 'zh' ? '儲存失敗' : 'Save failed'
  });

  return (
    <div className="flex flex-col h-full w-full bg-brand-bg pt-safe relative">
        <SettingsHeader 
          appLang={appLang}
          hasChanges={hasChanges}
          isSaving={isSavingSettings}
          onSave={() => runSaveSettings({ ...settings })}
          onClose={() => {
            if (onClose) onClose();
            else navigate.admin();
          }}
        />

      <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar pb-32">
        <SettingsTabs activeTab={activeTab} onTabChange={handleTabChange} />
        
        <div className="space-y-6">
          {loadedTabs.includes('general') && (
            <div className={activeTab === 'general' ? 'block' : 'hidden'}>
              <Suspense fallback={<LoadingScreen />}>
              <GeneralSettings 
                settings={settings}
                handleLogoUpload={handleLogoUpload}
                categories={categories}
                tags={tags}
                manufacturers={manufacturers}
                setSettingField={setSettingField}
                cardClass={cardClass}
                inputClass={inputClass}
                buttonStyles={BUTTON_STYLES}
              />
              </Suspense>
            </div>
          )}

          {loadedTabs.includes('ai') && (
            <div className={activeTab === 'ai' ? 'block' : 'hidden'}>
              <Suspense fallback={<LoadingScreen />}>
              <AISettings 
                agnesApiKey={String(agnesApiKey || "")}
                setAgnesApiKey={setAgnesApiKey}
                testConnection={async () => { await testConnection(); }}
                testResult={testResult}
                accessPasscode={String(accessPasscode || "")}
                setAccessPasscode={setAccessPasscode}
                setSettingField={setSettingField}
                cardClass={cardClass}
                inputClass={inputClass}
              />
              </Suspense>
            </div>
          )}

          {loadedTabs.includes('assets') && (
            <div className={activeTab === 'assets' ? 'block' : 'hidden'}>
              <Suspense fallback={<LoadingScreen />}>
                <AssetManagementContainer 
                  categories={categories}
                  deleteCategory={deleteCategory}
                  updateCategory={async (id: number, data: Partial<Category>) => { const r = await updateCategory({ id: Number(id), updates: data }); return !!r; }}
                  addCategory={async (name: string) => { const r = await addCategory(name); if (!r) throw ErrorFactory.wrap(new Error("Failed"), 'addCategory', name); return r; }}
                  manufacturers={manufacturers}
                  addManufacturer={async (name: string) => { const r = await addManufacturer(name); if (!r) throw ErrorFactory.wrap(new Error("Failed"), 'addManufacturer', name); return r; }}
                  updateManufacturer={async (id: string, data: Partial<Manufacturer>) => { const r = await updateManufacturer({ id: id, updates: data }); return !!r; }}
                  deleteManufacturer={(id: string) => deleteManufacturer(id)}
                  cardClass={cardClass}
                  buttonStyles={BUTTON_STYLES}
                />
                <TagsContainer 
                  tags={tags}
                  settings={settings}
                  addTag={async (name: string) => { const r = await addTag(name); if (!r) throw ErrorFactory.wrap(new Error("Failed"), 'addTag', name); return r; }}
                  updateTag={async (id: number, data: Partial<Tag>) => { const r = await updateTag({ id: Number(id), updates: data }); return !!r; }}
                  activeTagMenuId={activeTagMenuId}
                  setActiveTagMenuId={setActiveTagMenuId}
                  deleteTag={(id: number) => deleteTag(id)}
                  togglePin={(id: number) => togglePin(id)}
                  setSettings={setSettings}
                  setHasChanges={setHasChanges}
                  debouncedSave={debouncedSave}
                  cardClass={cardClass}
                  buttonStyles={BUTTON_STYLES}
                />
              </Suspense>
            </div>
          )}

          {loadedTabs.includes('status') && (
            <div className={activeTab === 'status' ? 'block' : 'hidden'}>
              <Suspense fallback={<LoadingScreen />}>
              <DiagDashboard />
              </Suspense>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
