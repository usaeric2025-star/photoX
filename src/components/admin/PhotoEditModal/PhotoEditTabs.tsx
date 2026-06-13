import { useState } from 'react';
import { Tabs } from "../../shared/Tabs";
import { BasicInfoTab } from "../PhotoEditDrawer/BasicInfoTab";
import { OrgTab } from "../PhotoEditDrawer/OrgTab";
import { DetailsTab } from "../PhotoEditDrawer/DetailsTab";
import { AISourceTab } from "../PhotoEditDrawer/AISourceTab";

export function PhotoEditTabs({ editPhotoId, appLang }: any) {
  const [activeTab, setActiveTab] = useState('basic');

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
      onChange={setActiveTab}
      className="flex-1 flex flex-col overflow-hidden bg-transparent"
      contentClassName="pt-2 no-scrollbar"
    >
      {activeTab === 'basic' && (
        <div className="px-8 xl:px-12 pb-12">
          <BasicInfoTab />
        </div>
      )}
      {activeTab === 'org' && (
        <div className="px-8 xl:px-12 pb-12">
          <OrgTab />
        </div>
      )}
      {activeTab === 'details' && (
        <div className="px-8 xl:px-12 pb-12">
          <DetailsTab />
        </div>
      )}
      {activeTab === 'ai-source' && (
        <div className="px-8 xl:px-12 pb-12">
          <AISourceTab photoId={editPhotoId || ''} />
        </div>
      )}
    </Tabs>
  );
}
