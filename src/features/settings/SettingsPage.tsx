import { logger } from '@/lib/logger';
import { useAppRouter } from '@/lib/router/useAppRouter';
import { useAppQuery as useQuery } from '@/lib/query';
import { useAuth } from '@/lib/store';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import React, { useState, Suspense } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';

import { showToast } from '@/lib/ui/toast';
import { AppSettings, User, ApiResponse } from '@/types';
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
import { useFormSubmit } from '@/lib/form/useFormSubmit';
import * as v from 'valibot';

import { useSyncMutation } from '@/hooks';
import { useTaskSelector, TaskState } from '@/lib/store';

const GeneralSettings = React.lazy(() => import('./GeneralSettings').then(m => ({ default: m.GeneralSettings })));
const AISettings = React.lazy(() => import('./AISettings').then(m => ({ default: m.AISettings })));
const TagsContainer = React.lazy(() => import('./TagsContainer').then(m => ({ default: m.TagsContainer })));
const AssetManagementContainer = React.lazy(() => import('./AssetManagementContainer').then(m => ({ default: m.AssetManagementContainer })));
const DiagnosticsDashboard = React.lazy(() => import('@/features/diagnostics/DiagnosticsDashboard').then(m => ({ default: m.DiagnosticsDashboard })));


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
  
  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();
  const { data: manufacturers = [] } = useManufacturers();
  const tasksMap = useTaskSelector((s: TaskState) => s.tasks);
  const tasks = React.useMemo(() => Array.from(tasksMap.values()), [tasksMap]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadLogo(file);
  };
  
  const isMaintenanceRunning = tasks.some((t: any) => (t.label.includes('维护') || t.label.includes('诊断')) && t.state?.status === 'processing');
  
  const appLang = useUI(s => s.appLang);
  const t = translations[appLang as keyof typeof translations] || translations.en;

  const { user, signIn, signOut } = useAuth();
  const { settings, agnesApiKey, customModel, accessPasscode, updateSettings } = useSettings();
  const setAgnesApiKey = (key: string) => updateSettings({ ...settings, agnes_api_key: key });
  const setAccessPasscode = (code: string) => updateSettings({ ...settings, access_passcode: code });
  const setSettings = (s: AppSettings) => { updateSettings(s as any); };
  const saveSettings = async (s: Partial<AppSettings>) => { await updateSettings(s); };

  const {
      tagToDelete,
      categoryToDelete,
      manufacturerToDelete,
      isTagDeleteOpen,
      tagDeleteDialog,
      isCategoryDeleteOpen,
      categoryDeleteDialog,
      isManufacturerDeleteOpen,
      manufacturerDeleteDialog,
      deleteTag,
      deleteCategory,
      deleteManufacturer,
      deleteTagRaw,
      deleteCategoryRaw,
      deleteManufacturerRaw,
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
    performPullSync: async () => ({ success: true, data: null }),
    setSettings: (s: AppSettings) => { void updateSettings(s as Partial<AppSettings>); }
  });

  const inputClass = "flex-1 min-w-0 bg-brand-navy/5 border border-brand-navy/10 p-3 rounded-2xl text-sm outline-none focus:border-brand-gold focus:bg-white shadow-inner font-normal tracking-tight placeholder:text-brand-navy/30 text-brand-navy";
  const cardClass = "bg-white rounded-[32px] p-6 shadow-sm border border-brand-navy/10 space-y-4";
  const [activeTab, setActiveTab] = React.useState('general');

  React.useEffect(() => {
    if (route === 'settings') setActiveTab('general');
    if (route === 'adminDiagnostics' || route === 'adminDiagnosticsLogs' || route === 'adminTasks') setActiveTab('status');
  }, [route]);

  const { submit: runSaveSettings, isLoading: isSavingSettings } = useFormSubmit({
    schema: v.any(),
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
        <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />
        
        <div className="space-y-6">
          {activeTab === 'general' && (
            <Suspense fallback={<LoadingScreen />}>
            <GeneralSettings 
              settings={settings}
              handleLogoUpload={handleLogoUpload}
              categories={categories}
              tags={tags}
              manufacturers={manufacturers}
              photos={[]}
              setSettingField={setSettingField}
              cardClass={cardClass}
              inputClass={inputClass}
              buttonStyles={BUTTON_STYLES}
            />
            </Suspense>
          )}

          {activeTab === 'ai' && (
            <Suspense fallback={<LoadingScreen />}>
            <AISettings 
              agnesApiKey={agnesApiKey || ""}
              setAgnesApiKey={setAgnesApiKey}
              customModel={customModel || ""}
              testConnection={async () => { await testConnection(); }}
              testResult={testResult}
              accessPasscode={accessPasscode || ""}
              setAccessPasscode={setAccessPasscode}
              setSettingField={setSettingField}
              cardClass={cardClass}
              inputClass={inputClass}
            />
            </Suspense>
          )}

          {activeTab === 'assets' && (
            <Suspense fallback={<LoadingScreen />}>
              <AssetManagementContainer 
                categories={categories}
                deleteCategory={deleteCategory}
                updateCategory={async (id: number, data: any) => { const r = await updateCategory({ id: Number(id), updates: data }); return !!r; }}
                addCategory={async (name: string) => { const r = await addCategory(name); if (!r) throw ErrorFactory.wrap(new Error("Failed"), 'addCategory', name); return r; }}
                manufacturers={manufacturers}
                addManufacturer={async (name: string) => { const r = await addManufacturer(name); if (!r) throw ErrorFactory.wrap(new Error("Failed"), 'addManufacturer', name); return r; }}
                updateManufacturer={async (id: number, data: any) => { const r = await updateManufacturer({ id: Number(id), updates: data }); return !!r; }}
                deleteManufacturer={(id: number) => deleteManufacturer(id)}
                cardClass={cardClass}
                buttonStyles={BUTTON_STYLES}
              />
              <TagsContainer 
                tags={tags}
                settings={settings}
                addTag={async (name: string) => { const r = await addTag(name); if (!r) throw ErrorFactory.wrap(new Error("Failed"), 'addTag', name); return r; }}
                updateTag={async (id: number, data: any) => { const r = await updateTag({ id: Number(id), updates: data }); return !!r; }}
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
          )}

          {activeTab === 'status' && (
            <Suspense fallback={<LoadingScreen />}>
            <DiagnosticsDashboard />
            </Suspense>
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
