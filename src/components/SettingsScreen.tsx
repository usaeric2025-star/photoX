import React from 'react';
import { 
  ChevronLeft,
  Settings2, Save
} from 'lucide-react';
import { useFeedback } from '@/hooks';
import { ErrorLogViewer } from './admin/ErrorLogViewer';
import { AppSettings, User, ApiResponse } from '@/types';
import { 
  useGalleryStore 
} from '@/store';
import { 
  useCategoriesQuery, useTagsQuery, useManufacturersQuery, useInfinitePhotos,
  useAdminCategory
} from '@/hooks';
import { useSettingsLogic } from './settings/useSettingsLogic';
import { GeneralSettings } from './settings/GeneralSettings';
import { AISettings } from './settings/AISettings';
import { SyncSettings } from './settings/SyncSettings';
import { TagsManager } from './settings/TagsManager';
import { CategoriesManager } from './settings/CategoriesManager';

interface SettingsScreenProps {
  setActiveScreen: (screen: 'home' | 'manage' | 'login') => void;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>, categories: any[], tags: any[], manufacturers: any[]) => Promise<void>;
  performPushSync: () => Promise<ApiResponse>;
  performPullSync: () => Promise<ApiResponse>;
  refreshCloudData: (user: User | null, force?: boolean) => Promise<void>;
  saveSettings: (s: AppSettings) => Promise<ApiResponse>;
  cloudCount: number | null;
  lastSyncTime: number | null;
  isSyncing: boolean;
}

const BUTTON_STYLES = {
  primary: "px-5 py-2.5 bg-brand-navy hover:bg-brand-navy/90 text-brand-bg rounded-2xl text-xs font-medium tracking-wide shadow-md active:scale-95 transition-all flex items-center gap-2 justify-center disabled:opacity-50",
  secondary: "px-5 py-2.5 bg-brand-bg border border-brand-navy/10 hover:bg-brand-navy/5 text-brand-navy rounded-2xl text-xs font-medium tracking-wide shadow-sm active:scale-95 transition-all flex items-center gap-2 justify-center disabled:opacity-50",
  accent: "px-5 py-2.5 bg-brand-gold hover:bg-brand-gold/90 text-white rounded-2xl text-xs font-medium tracking-wide shadow-md active:scale-95 transition-all flex items-center gap-2 justify-center disabled:opacity-50",
};

export const SettingsScreen: React.FC<SettingsScreenProps> = (props) => {
  const { showSuccess } = useFeedback();
  const { 
    settings, user, geminiApiKey, customModel, accessPasscode,
    setGeminiApiKey, setCustomModel, setAccessPasscode, setSettings,
    setAlertDialog,
    logout, loginWithGoogle
  } = useGalleryStore();

  const { data: categories = [] } = useCategoriesQuery();
  const { data: tags = [] } = useTagsQuery();
  const { data: manufacturers = [] } = useManufacturersQuery();
  
  const { data: infiniteData } = useInfinitePhotos({}, 100);
  const allPhotos = infiniteData?.pages.flatMap(p => p.photos) || [];
  const photos = Array.from(new Map(allPhotos.map(p => [p.id, p])).values());

  const { setActiveScreen, handleLogoUpload, performPushSync, performPullSync, refreshCloudData, cloudCount, lastSyncTime, saveSettings, isSyncing } = props;

  const {
      updateTag, deleteTag, updateCategory, deleteCategory, addCategory, 
      addManufacturer, updateManufacturer, deleteManufacturer, addTag
  } = useAdminCategory({ setAlertDialog });

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
    user,
    settings,
    geminiApiKey,
    customModel,
    saveSettings,
    performPullSync
  });

  const inputClass = "flex-1 min-w-0 bg-brand-navy/5 border border-brand-navy/10 p-3 rounded-2xl text-sm outline-none focus:border-brand-gold focus:bg-white shadow-inner font-normal tracking-tight placeholder:text-brand-navy/30 text-brand-navy";
  const cardClass = "bg-white rounded-[32px] p-6 shadow-sm border border-brand-navy/10 space-y-4";

  return (
    <div className="fixed inset-0 z-[500] bg-brand-bg flex flex-col pt-safe">
      <div className="px-6 py-4 flex items-center gap-3 bg-brand-bg sticky top-0 z-10">
        <button 
          onClick={() => setActiveScreen('home')} 
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
               showSuccess("保存成功 / Saved successfully");
             } else {
               showSuccess("没有更改需要保存 / No changes to save");
             }
           }}
           className={`p-2 rounded-lg shadow-md active:scale-95 transition-all flex items-center justify-center ${hasChanges ? 'bg-brand-gold hover:bg-brand-gold/90 text-white' : 'bg-brand-navy hover:bg-brand-navy/90 text-white'}`}
        >
            <Save size={16} />
        </button>
        <Settings2 size={20} className="text-brand-navy/20" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar pb-32">
        <div className="space-y-6">
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

          <SyncSettings 
            user={user}
            loginWithGoogle={loginWithGoogle}
            logout={logout}
            performPushSync={performPushSync}
            performPullSync={performPullSync}
            refreshCloudData={refreshCloudData}
            cloudCount={cloudCount}
            lastSyncTime={lastSyncTime}
            isSyncing={isSyncing}
            setAlertDialog={setAlertDialog}
            photos={photos}
            categories={categories}
            tags={tags}
            manufacturers={manufacturers}
            handleDeduplicate={handleDeduplicate}
            cardClass={cardClass}
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

          <CategoriesManager 
            categories={categories}
            deleteCategory={deleteCategory}
            updateCategory={updateCategory}
            addCategory={addCategory}
            manufacturers={manufacturers}
            addManufacturer={addManufacturer}
            updateManufacturer={updateManufacturer}
            deleteManufacturer={deleteManufacturer}
            cardClass={cardClass}
            buttonStyles={BUTTON_STYLES}
          />

          <TagsManager 
            tags={tags}
            settings={settings}
            addTag={addTag}
            updateTag={updateTag}
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

          <ErrorLogViewer />
        </div>
      </div>
    </div>
  );
};
