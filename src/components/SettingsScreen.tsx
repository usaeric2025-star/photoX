import React, { useState } from 'react';
import { 
  ChevronLeft, X, Cloud, LogOut,
  Trash2, Upload, Database,
  Plus, Settings2, Image as ImageIcon, Sparkles, Lock, CloudUpload, CloudDownload,
  User as UserIcon, Heart, CheckCircle2, AlertCircle, Save, Pencil
} from 'lucide-react';
import { useFeedback } from '../hooks';
import { ErrorLogViewer } from './admin/ErrorLogViewer';
import { Skeleton } from './ui/Skeleton';
import { deduplicatePhotos } from '../services/photoMutationService';
import { Tag, Category, Photo, Manufacturer, AppSettings, User, ApiResponse } from '../types';
import { ManufacturerItem } from './admin/ManufacturerItem';
import { motion, AnimatePresence } from 'motion/react';
import { testAiConnection } from '../services/geminiService';
import { addTagToDB, deleteTagFromDB } from '../services/supabaseService';
import { normalizeTagName, normalizeManufacturerName } from '../utils/stringHelper';
import { 
  useGalleryStore 
} from '../store';
import { 
  useCategoriesQuery, useTagsQuery, useManufacturersQuery, useInfinitePhotos,
  useAdminCategory
} from '../hooks';
import { useSettingsLogic } from './settings/useSettingsLogic';
import { useSettingsActions } from './settings/useSettingsActions';
import { SyncSection } from './settings/SyncSection';
import { TagItem } from './settings/TagItem';
import { AISecuritySection } from './settings/AISecuritySection';
import { WhatsAppSection } from './settings/WhatsAppSection';
import { LogoSection } from './settings/LogoSection';
import { TagsSection } from './settings/TagsSection';
import { CategoriesSection } from './settings/CategoriesSection';
import { ManufacturersSection } from './settings/ManufacturersSection';
import { ExportDataSection } from './settings/ExportDataSection';
import { MaintenanceSection } from './settings/MaintenanceSection';

interface SettingsScreenProps {
  setActiveScreen: (screen: 'home' | 'manage' | 'login') => void;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>, categories: Category[], tags: Tag[], manufacturers: Manufacturer[]) => Promise<void>;
  performPushSync: () => Promise<ApiResponse>;
  performPullSync: () => Promise<ApiResponse>;
  refreshCloudData: (user: User | null, force?: boolean) => Promise<void>;
  saveSettings: (s: AppSettings) => Promise<ApiResponse>;
  cloudCount: number | null;
  lastSyncTime: number | null;
  isSyncing: boolean;
}

const obfuscateKey = (key: string) => {
  if (!key) return '';
  return btoa(key).split('').reverse().join('');
};

const BUTTON_STYLES = {
  primary: "px-5 py-2.5 bg-brand-navy hover:bg-brand-navy/90 text-brand-bg rounded-2xl text-xs font-medium tracking-wide shadow-md active:scale-95 transition-all flex items-center gap-2 justify-center disabled:opacity-50",
  secondary: "px-5 py-2.5 bg-brand-bg border border-brand-navy/20 hover:bg-brand-navy/5 text-brand-navy rounded-2xl text-xs font-medium tracking-wide shadow-sm active:scale-95 transition-all flex items-center gap-2 justify-center disabled:opacity-50",
  accent: "px-5 py-2.5 bg-brand-gold hover:bg-brand-gold/90 text-white rounded-2xl text-xs font-medium tracking-wide shadow-md active:scale-95 transition-all flex items-center gap-2 justify-center disabled:opacity-50",
};

export const SettingsScreen: React.FC<SettingsScreenProps> = (props) => {
  const { showSuccess, showError } = useFeedback();
  const { 
    settings, user, geminiApiKey, customModel, accessPasscode, appLang,
    setGeminiApiKey, setCustomModel, setAccessPasscode, setSettings,
    setAlertDialog, setPromptDialog, withLoading,
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

  const [newCategoryName, setNewCategoryName] = useState('');


  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    await addCategory(newCategoryName.trim());
    setNewCategoryName('');
  };

  const handleAddTag = () => {
    setPromptDialog({
      title: '新增标签',
      message: '输入标签名称:',
      onSubmit: async (name: string) => {
        if (!name.trim()) return;
        const normalized = name.trim().toUpperCase();
        try {
          await addTag(normalized);
        } catch (error: any) {
          showError(error, '添加标签失败');
        }
      }
    });
  };

  const handleAddManufacturer = () => {
    setPromptDialog({
      title: '新增生产商 / Add Manufacturer',
      message: '输入生产商名称 / Enter manufacturer name:',
      onSubmit: async (name: string) => {
        if (!name.trim()) return;
        const normalized = normalizeManufacturerName(name);
        if (normalized) {
            await addManufacturer(normalized);
        }
      }
    });
  };

  const handleUpdateTagName = (tag: Tag) => {
    setPromptDialog({
      title: '编辑标签名 / Edit Tag Name',
      message: '输入新的标签名称 / Enter new tag name:',
      placeholder: tag.name,
      onSubmit: async (newName) => {
        const normalized = normalizeTagName(newName);
        if (normalized && normalized !== tag.name) {
          await updateTag(tag.id, { name: normalized });
        }
      }
    });
  };

  const handleUpdateMfrName = async (mfr: Manufacturer) => {
    setPromptDialog({
      title: '编辑生产商 / Edit Manufacturer',
      message: '输入新名称 / Enter new name:',
      placeholder: mfr.name,
      onSubmit: async (newName) => {
        const normalized = normalizeManufacturerName(newName);
        if (normalized && normalized !== mfr.name) {
          try {
            await updateManufacturer(String(mfr.id), { name: normalized });
            showSuccess('厂商更新成功');
          } catch (e) {
            showError(e, '更新厂商失败');
          }
        }
      }
    });
  };

  const handleUpdateCatName = async (cat: Category) => {
    setPromptDialog({
      title: '编辑分类 / Edit Category',
      message: '输入新名称 / Enter new name:',
      placeholder: cat.name,
      onSubmit: async (newName) => {
        if (newName && newName.trim() !== cat.name) {
          await updateCategory(cat.id, { name: newName.trim() });
        }
      }
    });
  };

  const inputClass = "flex-1 min-w-0 bg-brand-navy/5 border border-brand-navy/10 p-3 rounded-2xl text-sm outline-none focus:border-brand-gold focus:bg-white shadow-inner font-normal tracking-tight placeholder:text-brand-navy/30 text-brand-navy";
  const cardClass = "bg-white rounded-[32px] p-6 shadow-sm border border-brand-navy/10 space-y-4";

  return (
    <div className="fixed inset-0 z-[500] bg-brand-bg flex flex-col pt-safe">
      {/* Settings Header */}
      <div className="px-6 py-4 flex items-center gap-3 bg-brand-bg sticky top-0 z-10">
        <button 
          onClick={() => setActiveScreen('home')} 
          className="p-2 -ml-2 text-brand-navy/50 hover:text-brand-navy transition-colors rounded-full active:bg-brand-navy/5"
          id="btn-settings-back"
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
              {/* Logo Section */}
              <LogoSection 
                settings={settings}
                handleLogoUpload={handleLogoUpload}
                categories={categories}
                tags={tags}
                manufacturers={manufacturers}
                cardClass={cardClass}
                buttonStyles={BUTTON_STYLES}
              />

        {/* Sync Section Refined */}
        <SyncSection 
          user={user}
          loginWithGoogle={loginWithGoogle}
          logout={async () => logout()}
          performPushSync={performPushSync}
          performPullSync={performPullSync}
          refreshCloudData={refreshCloudData}
          cloudCount={cloudCount}
          lastSyncTime={lastSyncTime}
          isSyncing={isSyncing}
          setAlertDialog={setAlertDialog}
        />

        <AISecuritySection 
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

        <CategoriesSection 
          categories={categories}
          deleteCategory={deleteCategory}
          updateCategory={updateCategory}
          addCategory={addCategory}
          cardClass={cardClass}
        />

        <ManufacturersSection 
          manufacturers={manufacturers}
          handleAddManufacturer={handleAddManufacturer}
          handleUpdateMfrName={handleUpdateMfrName}
          deleteManufacturer={deleteManufacturer}
          cardClass={cardClass}
          buttonStyles={BUTTON_STYLES}
        />

        {/* Tags Section */}
        <TagsSection 
          tags={tags}
          settings={settings}
          handleAddTag={handleAddTag}
          activeTagMenuId={activeTagMenuId}
          setActiveTagMenuId={setActiveTagMenuId}
          handleUpdateTagName={handleUpdateTagName}
          deleteTag={deleteTag}
          togglePin={togglePin}
          setSettings={setSettings}
          setHasChanges={setHasChanges}
          debouncedSave={debouncedSave}
          cardClass={cardClass}
          buttonStyles={BUTTON_STYLES}
        />


        <ExportDataSection 
           photos={photos}
           categories={categories}
           tags={tags}
           manufacturers={manufacturers}
           isSyncing={isSyncing}
           user={user}
           cardClass={cardClass}
           buttonStyles={BUTTON_STYLES}
           handleDeduplicate={handleDeduplicate}
        />

        <MaintenanceSection 
           photos={photos}
           onHealthCheck={() => handleHealthCheck(allPhotos)}
           isChecking={false}
           cardClass={cardClass}
           buttonStyles={BUTTON_STYLES}
        />

          {/* WhatsApp 联系人设定 (Original Location) */}
          <WhatsAppSection 
            settings={settings}
            setSettingField={setSettingField}
            cardClass={cardClass}
            inputClass={inputClass}
          />
          <ErrorLogViewer />
        </div>
      </div>
    </div>
  );
};
