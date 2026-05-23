import React from 'react';
import { Settings2, Trash2 } from 'lucide-react';
import { SheetHeader, SheetTitle } from "../../ui/sheet";
import { ProductGroup, DialogData } from '../../../types';
import { saveGroupToCloud } from '../../../services/groupService';
import { useFeedback } from '../../../hooks';

export const GroupSettingsHeader: React.FC<{
  groupData: ProductGroup | null;
  activeGroupId: string | null;
  onUngroup?: (groupId: string) => void;
  setActiveGroupId: (id: string | null) => void;
  setShowGroupSettings: (show: boolean) => void;
  setAlertDialog: (d: DialogData | null) => void;
  setIsSaving: (isSaving: boolean) => void;
  isSaving: boolean;
}> = ({
  groupData, activeGroupId, onUngroup, setActiveGroupId, setShowGroupSettings,
  setAlertDialog, setIsSaving, isSaving
}) => {
  const { showError: handleError } = useFeedback();
  return (
    <SheetHeader className="p-6 border-b border-slate-50 bg-indigo-600 text-white space-y-0 flex-row items-center justify-between">
      <div className="flex items-center gap-3">
        <Settings2 size={20} />
        <SheetTitle className="font-black text-lg tracking-tight text-white m-0">合组设置</SheetTitle>
      </div>
      <div className="flex items-center gap-2">
         <button 
           onClick={() => {
             if (onUngroup && activeGroupId) {
               setAlertDialog({
                 title: '确认删除',
                 message: '确定要解散（删除）整个群组吗？此操作不可恢复。',
                 confirmLabel: '删除',
                 cancelLabel: '取消',
                 type: 'danger',
                 onConfirm: async () => {
                   try {
                     if (onUngroup && activeGroupId) {
                       onUngroup(activeGroupId);
                       setActiveGroupId(null);
                       setShowGroupSettings(false);
                     }
                     setAlertDialog(null);
                   } catch (e) {
                     handleError(e, '解散群组失败');
                     setAlertDialog(null);
                   }
                 }
               });
             }
           }}
           className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
           title="解散群组"
         >
           <Trash2 size={18} />
         </button>

         <button 
           onClick={async () => {
             if (groupData) {
               try {
                 setIsSaving(true);
                 await saveGroupToCloud(groupData);
                 setIsSaving(false);
                 setShowGroupSettings(false);
               } catch (e) {
                 handleError(e, '保存群组失败');
                 setIsSaving(false);
               }
             } else {
               setShowGroupSettings(false);
             }
           }}
           disabled={isSaving}
           className="w-24 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-white text-indigo-600 hover:bg-white shadow-xl transition-all font-black disabled:opacity-50"
           title="保存并关闭"
         >
           {isSaving ? 'Saving...' : '保存'}
         </button>
      </div>
    </SheetHeader>
  );
};
