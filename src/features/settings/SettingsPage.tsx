import React, { Suspense, useState } from 'react';
import { AppSettings } from '#src/types/index.js';
import { useAuth } from '#lib/store/index.js';
import { 
  useSettings, useTranslation 
} from '#src/hooks/index.js';
import { SettingsTabs } from './SettingsTabs.js';
import { SettingsHeader } from './SettingsHeader.js';
import { LoadingScreen } from '#src/components/ui/LoadingScreen.js';
import { useFormSubmit } from '#lib/forms/useFormSubmit.js';
import * as v from 'valibot';
import { StandardModalLayout } from '#src/components/ui/StandardModalLayout.js';
import { useNormalizedLocation, useDebouncedCallback } from '#src/hooks/core/index.js';
import { testAiConnection } from "#src/features/ai/AICommands.js";
import { executeTask } from '#lib/task-queue/index.js';
import { uploadToR2 } from '#src/lib/upload/index.js';

const GeneralSettings = React.lazy(() => import('./GeneralSettings.js').then(m => ({ default: m.GeneralSettings })));
const AISettings = React.lazy(() => import('./AISettings.js').then(m => ({ default: m.AISettings })));
const TagsSection = React.lazy(() => import('./TagsSection.js').then(m => ({ default: m.TagsSection })));
const CategoriesSection = React.lazy(() => import('./CategoriesSection.js').then(m => ({ default: m.CategoriesSection })));
const ManufacturersSection = React.lazy(() => import('./ManufacturersSection.js').then(m => ({ default: m.ManufacturersSection })));
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
  const [location, setLocation] = useNormalizedLocation();
  
  const { t, appLang } = useTranslation();

  const user = useAuth(s => s.user);
  const { settings, agnesApiKey, accessPasscode, updateSettings } = useSettings();
  const setAgnesApiKey = (key: string) => updateSettings({ ...settings, agnesApiKey: key });
  const setAccessPasscode = (code: string) => updateSettings({ ...settings, accessPasscode: code });
  const saveSettings = async (s: Partial<AppSettings>) => { await updateSettings(s); };

  const [testResult, setTestResult] = useState<{ success?: boolean; error?: string; loading?: boolean; } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const { submit: runConnectionTest } = useFormSubmit({
    schema: v.object({}),
    mutationFn: async () => {
      const ok = await testAiConnection(String(settings.agnesApiKey || ""), "google");
      if (!ok) throw new Error(t('aiConnectFailed'));
      return true;
    },
    onSuccess: () => setTestResult({ success: true }),
    onError: (msg: unknown) => setTestResult({ success: false, error: String(msg) }),
    successMessage: t('aiConnectSuccess'),
    errorMessage: t('aiConnectFailed')
  });

  const testConnection = async () => {
    if (!settings?.agnesApiKey) return;
    await runConnectionTest({});
  };

  const debouncedSave = useDebouncedCallback((newSettings: AppSettings) => {
    updateSettings(newSettings).catch(console.error);
    setHasChanges(false);
  }, 1500);

  const setSettingField = <K extends keyof AppSettings>(field: K, value: AppSettings[K]) => {
    const current = settings || {} as AppSettings;
    const newSettings = { ...current, [field]: value };
    void updateSettings(newSettings);
    setHasChanges(true);
    debouncedSave(newSettings);
  };

  const uploadLogo = async (file: File) => {
    return executeTask({
      label: t('uploadLogoTask'),
      type: 'upload',
      execute: async () => {
        const fileKey = `settings/logo_${Date.now()}`;
        const imageUrl = await uploadToR2(file, fileKey);
        setSettingField('logoUrl', imageUrl);
        return imageUrl;
      }
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadLogo(file);
  };

  const inputClass = "flex-1 min-w-0 bg-brand-navy/5 border border-brand-navy/10 p-3 rounded-2xl text-sm outline-none focus:border-brand-gold focus:bg-white shadow-inner font-normal tracking-tight placeholder:text-brand-navy/30 text-brand-navy";
  const cardClass = "bg-white rounded-[32px] p-6 shadow-sm border border-brand-navy/10 space-y-4";
  const initialTab = (() => {
    if (location.startsWith('/admin/diagnose') || 
        location.startsWith('/admin/error-logs') || 
        location.startsWith('/admin/tasks')) {
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
    <StandardModalLayout 
      onClose={() => {
        if (onClose) onClose();
        else setLocation('/admin');
      }}
      className="bg-brand-bg"
      header={
        <SettingsHeader 
          hasChanges={hasChanges}
          isSaving={isSavingSettings}
          onSave={() => runSaveSettings({ ...settings })}
          onClose={() => {
            if (onClose) onClose();
            else setLocation('/admin');
          }}
        />
      }
    >
      <div className="pt-4">
        <SettingsTabs activeTab={activeTab} onTabChange={handleTabChange} />
        
        <div className="space-y-6 mt-6">
          {loadedTabs.includes('general') && (
            <div className={activeTab === 'general' ? 'block' : 'hidden'}>
              <Suspense fallback={<LoadingScreen />}>
              <GeneralSettings 
                settings={settings}
                handleLogoUpload={handleLogoUpload}
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
                <CategoriesSection 
                  cardClass={cardClass}
                  buttonStyles={BUTTON_STYLES}
                />
                <ManufacturersSection 
                  cardClass={cardClass}
                  buttonStyles={BUTTON_STYLES}
                />
                <TagsSection 
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
    </StandardModalLayout>
  );
}
