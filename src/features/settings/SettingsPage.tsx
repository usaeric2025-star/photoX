import React, { Suspense, useState, useCallback } from 'react';
import { AppSettings } from '#src/types/index.js';
import { } from '#lib/store/index.js';
import { 
  useSettings, useTranslation 
} from '#src/hooks/index.js';
import { SettingsTabs } from './SettingsTabs.js';
import { SettingsHeader } from './SettingsHeader.js';
import { LoadingScreen } from '#src/components/ui/LoadingScreen.js';
import { useFormSubmit } from '#lib/forms/useFormSubmit.js';
import * as v from 'valibot';
import { StandardModalLayout } from '#src/components/ui/StandardModalLayout.js';
import { useNormalizedLocation, useDebounceFn } from '#src/hooks/core/index.js';
import { testAiConnection } from "#src/features/ai/AICommands.js";
import { executeTask } from '#lib/task-queue/index.js';
import { uploadToR2 } from '#src/lib/upload/index.js';
import { logger } from '#lib/logger.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';

import { GeneralSettings } from './GeneralSettings.js';
import { AISettings } from './AISettings.js';
import { TagsSection } from './TagsSection.js';
import { CategoriesSection } from './CategoriesSection.js';
import { ManufacturersSection } from './ManufacturersSection.js';
import { DiagDashboard } from '#src/features/diagnostics/DiagDashboard.js';

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
  const { settings, agnesApiKey, accessPasscode, updateSettings } = useSettings();
  
  const [testResult, setTestResult] = useState<{ success?: boolean; error?: string; loading?: boolean; } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const { submit: runConnectionTest } = useFormSubmit({
    schema: v.object({}),
    mutationFn: async () => {
      const ok = await testAiConnection(String(agnesApiKey || ""), "google");
      if (!ok) throw new Error(t('aiConnectFailed'));
      return true;
    },
    onSuccess: () => setTestResult({ success: true }),
    onError: (msg: unknown) => setTestResult({ success: false, error: String(msg) }),
  });

  const testConnection = async () => {
    if (!agnesApiKey) return;
    setTestResult({ loading: true });
    await runConnectionTest({});
  };

  const { run: debouncedSave } = useDebounceFn((newSettings: AppSettings) => {
    updateSettings(newSettings).catch(e => ErrorFactory.handle(e, { context: '[SettingsPage] debouncedSave failed', silent: true }));
    setHasChanges(false);
  }, 1500);

  const setSettingField = useCallback(<K extends keyof AppSettings>(field: K, value: AppSettings[K]) => {
    if (!settings) return;
    const newSettings = { ...settings, [field]: value };
    setHasChanges(true);
    debouncedSave(newSettings);
  }, [settings, debouncedSave]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await executeTask({
        label: t('uploadLogoTask'),
        type: 'upload',
        execute: async () => {
          const fileKey = `settings/logo_${Date.now()}`;
          const imageUrl = await uploadToR2(file, fileKey);
          setSettingField('logoUrl', imageUrl);
          return imageUrl;
        }
      });
    }
  };

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
    schema: v.any(),
    mutationFn: async (s: Partial<AppSettings>) => {
      await updateSettings(s as AppSettings);
    },
    onSuccess: () => {
      setHasChanges(false);
    }
  });

  const cardClass = "bg-white rounded-[32px] p-6 shadow-sm border border-brand-navy/10 space-y-4";
  const inputClass = "flex-1 min-w-0 bg-brand-navy/5 border border-brand-navy/10 p-3 rounded-2xl text-sm outline-none focus:border-brand-gold focus:bg-white shadow-inner font-normal tracking-tight placeholder:text-brand-navy/30 text-brand-navy";

  const close = () => {
    if (onClose) onClose();
    else setLocation('/admin');
  };

  return (
    <StandardModalLayout 
      onClose={close}
      className="bg-brand-bg"
      header={
        <SettingsHeader 
          hasChanges={hasChanges}
          isSaving={isSavingSettings}
          onSave={() => runSaveSettings({ ...settings })}
          onClose={close}
        />
      }
    >
      <div className="pt-4">
        <SettingsTabs activeTab={activeTab} onTabChange={handleTabChange} />
        
        <div className="space-y-6 mt-6">
          {loadedTabs.includes('general') && (
            <div className={activeTab === 'general' ? 'block' : 'hidden'}>
              <GeneralSettings 
                settings={settings!}
                handleLogoUpload={handleLogoUpload}
                setSettingField={setSettingField}
                cardClass={cardClass}
                inputClass={inputClass}
                buttonStyles={BUTTON_STYLES}
              />
            </div>
          )}

          {loadedTabs.includes('ai') && (
            <div className={activeTab === 'ai' ? 'block' : 'hidden'}>
              <AISettings 
                agnesApiKey={String(agnesApiKey || "")}
                setAgnesApiKey={(key) => setSettingField('agnesApiKey', key)}
                testConnection={testConnection}
                testResult={testResult}
                accessPasscode={String(accessPasscode || "")}
                setAccessPasscode={(code) => setSettingField('accessPasscode', code)}
                setSettingField={setSettingField}
                cardClass={cardClass}
                inputClass={inputClass}
              />
            </div>
          )}

          {loadedTabs.includes('assets') && (
            <div className={activeTab === 'assets' ? 'block' : 'hidden'}>
              <div className="space-y-6">
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
              </div>
            </div>
          )}

          {loadedTabs.includes('status') && (
            <div className={activeTab === 'status' ? 'block' : 'hidden'}>
              <DiagDashboard />
            </div>
          )}
        </div>
      </div>
    </StandardModalLayout>
  );
}
