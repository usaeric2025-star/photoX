import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { BasicInfoTab } from "./BasicInfoTab";
import { OrgTab } from "./OrgTab";
import { DetailsTab } from "./DetailsTab";
import { AISourceTab } from "./AISourceTab";

export function PhotoEditTabs({ editPhotoId, appLang }: any) {
  return (
    <Tabs
        defaultValue="basic"
        className="flex-1 flex flex-col overflow-hidden"
    >
        <div className="w-full px-8 xl:px-12">
            <div className="pb-2 border-b border-slate-100 bg-white">
            <TabsList className="w-full bg-slate-100/50 p-1 rounded-2xl h-12 flex items-center gap-1 border border-slate-200">
                <TabsTrigger value="basic" className="flex-1 rounded-xl text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 transition-all h-full">
                {appLang === 'zh' ? '基础' : 'BASIC'}
                </TabsTrigger>
                <TabsTrigger value="org" className="flex-1 rounded-xl text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 transition-all h-full">
                {appLang === 'zh' ? '组织' : 'ORG'}
                </TabsTrigger>
                <TabsTrigger value="details" className="flex-1 rounded-xl text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 transition-all h-full">
                {appLang === 'zh' ? '细节' : 'DETAIL'}
                </TabsTrigger>
                <TabsTrigger value="ai-source" className="flex-1 rounded-xl text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 transition-all h-full">
                {appLang === 'zh' ? 'AI原始数据' : 'AI RAW'}
                </TabsTrigger>
            </TabsList>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pt-2 w-full px-8 xl:px-12 pb-12">
            <TabsContent value="basic">
            <BasicInfoTab />
            </TabsContent>

            <TabsContent value="org">
            <OrgTab />
            </TabsContent>

            <TabsContent value="details">
            <DetailsTab />
            </TabsContent>

            <TabsContent value="ai-source">
            <AISourceTab
                photoId={editPhotoId || ''}
            />
            </TabsContent>
        </div>
    </Tabs>
  );
}
