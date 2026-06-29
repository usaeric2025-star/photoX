import { logger } from '@/lib/logger';
import { useAppRouter } from '@/lib/router';
import { useAppQuery as useQuery } from '@/lib/query';
import { useAuth } from '@/lib/store';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import React, { useState, Suspense } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';

import { showToast } from '@/lib/ui/toast';
import { Task } from '@/lib/task-queue/types';
import { AppSettings, User, ApiResponse, Category, Manufacturer, Tag } from '@/types';
import { useUI, UIStoreState } from '@/lib/store';
import { useSettingsManagement } from '@/hooks/settings/useSettingsManagement';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { 
  useCategories, useTags, useManufacturers,
  useAdminCategory, useSettings
} from '@/hooks';
import { useSettingsLogic } from './useSettingsLogic';
import { SettingsTabs } from './SettingsTabs';
import { SettingsHeader } from './SettingsHeader';
import { translations } from '@/locales';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useFormSubmit } from '@/lib/forms/useFormSubmit';
import * as v from 'valibot';

import { useSyncMutation } from '@/hooks';
import { useStore } from '@/lib/store';
import { taskStore } from '@/services/task/taskService';

const GeneralSettings = React.lazy(() => import('./GeneralSettings').then(m => ({ default: m.GeneralSettings })));
const AISettings = React.lazy(() => import('./AISettings').then(m => ({ default: m.AISettings })));
const TagsContainer = React.lazy(() => import('./TagsContainer').then(m => ({ default: m.TagsContainer })));
const AssetManagementContainer = React.lazy(() => import('./AssetManagementContainer').then(m => ({ default: m.AssetManagementContainer })));
const DiagDashboard = React.lazy(() => import('@/features/diagnostics/DiagDashboard').then(m => ({ default: m.DiagDashboard })));


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
  const setAgnesApiKey = (key: string) => updateSettings({ ...settings, agnes_api_key: key });
  const setAccessPasscode = (code: string) => updateSettings({ ...settings, access_passcode: code });
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
    agnesApiKey: agnesApiKey || "",
    saveSettings,
    performPullSync: async () => {},
    setSettings: (s: AppSettings) => { void updateSettings(s as Partial<AppSettings>); }
  });

  const inputClass = "flex-1 min-w-0 bg-brand-navy/5 border border-brand-navy/10 p-3 rounded-2xl text-sm outline-none focus:border-brand-gold focus:bg-white shadow-inner font-normal tracking-tight placeholder:text-brand-navy/30 text-brand-navy";
  const cardClass = "bg-white rounded-[32px] p-6 shadow-sm border border-brand-navy/10 space-y-4";
  const [activeTab, setActiveTab] = React.useState('general');
  const [loadedTabs, setLoadedTabs] = React.useState<string[]>(['general']);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (!loadedTabs.includes(tabId)) {
      setLoadedTabs(prev => [...prev, tabId]);
    }
  };

  React.useEffect(() => {
    if (route?.name === 'settings') {
      handleTabChange('general');
    }
    if (route?.name === 'adminDiagnostics' || route?.name === 'adminDiagnosticsLogs' || route?.name === 'adminTasks') {
      handleTabChange('status');
    }
  }, [route]);

  const { submit: runSaveSettings, isLoading: isSavingSettings } = useFormSubmit({
    schema: v.partial(v.object({
      app_name: v.string(),
      logo_url: v.string(),
      pinned_tags: v.array(v.string()),
      hot_tags_count: v.number(),
      hot_tag_threshold: v.number(),
      agnes_api_key: v.string(),
      whatsapp_1_name: v.string(),
      whatsapp_1: v.string(),
      whatsapp_2_name: v.string(),
      whatsapp_2: v.string(),
      facebook: v.string(),
      instagram: v.string(),
      access_passcode: v.string(),
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
                agnesApiKey={agnesApiKey || ""}
                setAgnesApiKey={setAgnesApiKey}
                testConnection={async () => { await testConnection(); }}
                testResult={testResult}
                accessPasscode={accessPasscode || ""}
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
