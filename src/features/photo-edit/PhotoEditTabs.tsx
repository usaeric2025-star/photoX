import { useAtomValue } from 'jotai';
import { appLangAtom } from '#src/store/index.js';
import React, { useState } from 'react';
import { Tabs } from "#src/components/shared/Tabs.js";
import { cn } from "#lib/utils.js";
import { BasicInfoTab } from "./BasicInfoTab.js";
import { OrgTab } from "./OrgTab.js";
import { DetailsTab } from "./DetailsTab.js";
import { AISourceTab } from "./AISourceTab.js";
import { } from '#lib/store/index.js';
import { usePhotoEditSessionContext } from './hooks/PhotoEditSession.js';

/**
 * PhotoEditTabs
 * 
 * 照片編輯對話框中的分頁容器。
 */
export function PhotoEditTabs() {
  const { photoId } = usePhotoEditSessionContext();
  const appLang = useAtomValue(appLangAtom);
  const [activeTab, setActiveTab] = useState('basic');
  const [loadedTabs, setLoadedTabs] = useState<string[]>(['basic']);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (!loadedTabs.includes(tabId)) {
      setLoadedTabs(prev => [...prev, tabId]);
    }
  };

  const tabs = [
    { id: 'basic', label: appLang === 'zh' ? '基础' : 'BASIC' },
    { id: 'org', label: appLang === 'zh' ? '组织' : 'ORG' },
    { id: 'details', label: appLang === 'zh' ? '细节' : 'DETAIL' },
    { id: 'ai-source', label: appLang === 'zh' ? 'AI原始数据' : 'AI RAW' },
  ];

  return (
    <Tabs
      tabs={tabs}
      activeTab={activeTab}
      onChange={handleTabChange}
      className="flex-1 flex flex-col overflow-hidden bg-transparent"
      contentClassName="pt-2 no-scrollbar"
    >
      {loadedTabs.includes('basic') && (
        <div className={cn("px-4 md:px-8 xl:px-12 pb-12", activeTab === 'basic' ? 'block' : 'hidden')}>
          <BasicInfoTab />
        </div>
      )}
      {loadedTabs.includes('org') && (
        <div className={cn("px-4 md:px-8 xl:px-12 pb-12", activeTab === 'org' ? 'block' : 'hidden')}>
          <OrgTab />
        </div>
      )}
      {loadedTabs.includes('details') && (
        <div className={cn("px-4 md:px-8 xl:px-12 pb-12", activeTab === 'details' ? 'block' : 'hidden')}>
          <DetailsTab />
        </div>
      )}
      {loadedTabs.includes('ai-source') && (
        <div className={cn("px-4 md:px-8 xl:px-12 pb-12", activeTab === 'ai-source' ? 'block' : 'hidden')}>
          <AISourceTab />
        </div>
      )}
    </Tabs>
  );
}
