import { ErrorFactory } from '@/lib/error/ErrorFactory';
import React, { useState } from 'react';
import { 
  ChevronLeft,
  Settings2, Save, ChevronDown, X
} from 'lucide-react';
import { api } from '@/lib/api';

import { showToast } from '@/lib/ui/toast';
import { ErrorLogViewer } from '../admin/ErrorLogViewer';
import { AppSettings, User, ApiResponse } from '@/types';
import { 
  useUIStore, useShallow
} from '@/store/useUIStore';
import { useSettingsManagement } from '@/hooks/settings/useSettingsManagement';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { 
  useCategories, useTags, useManufacturers, usePhotos,
  useAdminCategory, useAuth, useSettings, usePhotoCount
} from '@/hooks';
import { useSettingsLogic } from './useSettingsLogic';
import { SettingsTabs } from './SettingsTabs';
import { SettingsHeader } from './SettingsHeader';
import { GeneralSettings } from './GeneralSettings';
import { AISettings } from './AISettings';
import { SyncSettings } from './SyncSettings';
import { TagsManager } from './TagsManager';
import { CategoriesManager } from './CategoriesManager';
import { DiagnosticsDashboard } from '../admin/DiagnosticsDashboard';
import { translations } from '@/locales';

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
    if (['tasks', 'error-logs', 'logs', 'diagnostics'].includes(activeScreen)) setActiveTab('status');
  }, [activeScreen]);

  return (
    <div className="fixed inset-0 z-[var(--z-index-max)] bg-brand-bg flex flex-col pt-safe">
        <SettingsHeader 
          appLang={appLang}
          hasChanges={hasChanges}
          onSave={async () => {
             try {
               await saveSettings({ ...settings });
               setHasChanges(false);
               showToast.success('设置已保存');
             } catch (err) {
               console.error("Save settings failed:", err);
             }
          }}
          onClose={() => {
            if (onClose) onClose();
            else update({ activeScreen: 'gallery' });
          }}
        />

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
