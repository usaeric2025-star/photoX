import React from 'react';
import { Settings2, Trash2, X } from 'lucide-react';
import { SheetHeader, SheetTitle } from "../../ui/sheet";
import { ProductGroup, DialogData } from '../../../types';
import { saveGroupToCloud } from '../../../services/groupService';
import { useFeedback, useTaskExecutor, useTasks } from '../../../hooks';

export const GroupSettingsHeader: React.FC<{
  groupData: ProductGroup | null;
  activeGroupId: string | null;
  onUngroup?: (groupId: string) => void;
  setActiveGroupId: (id: string | null) => void;
  setShowGroupSettings: (show: boolean) => void;
  setAlertDialog: (d: DialogData | null) => void;
}> = ({
  groupData, activeGroupId, onUngroup, setActiveGroupId, setShowGroupSettings,
  setAlertDialog
}) => {
  const { showError: handleError } = useFeedback();
  const { runTask } = useTaskExecutor();
  const { tasks } = useTasks();
  const isRunning = tasks.some(t => t.status === 'running');

  return (
    <SheetHeader className="p-4 border-b border-slate-50 bg-indigo-600 text-white space-y-0 flex-row items-center justify-between">
      <div className="flex items-center gap-2">
        <Settings2 size={18} />
        <SheetTitle className="font-black text-sm uppercase tracking-wider text-white m-0">合组设置</SheetTitle>
      </div>
      <div className="flex items-center gap-2">
         <button 
           disabled={isRunning}
           onClick={() => {
             if (onUngroup && activeGroupId) {
               setAlertDialog({
                 title: '确认删除',
                 message: '确定要解散（删除）整个群组吗？此操作不可恢复。',
                 confirmLabel: '删除',
                 cancelLabel: '取消',
                 type: 'danger',
                 onConfirm: async () => {
                   await runTask('解散群组', async () => {
                     if (onUngroup && activeGroupId) {
                       onUngroup(activeGroupId);
                       setActiveGroupId(null);
                       setShowGroupSettings(false);
                     }
                     setAlertDialog(null);
                   }, { showSuccessToast: true, silent: true });
                 }
               });
             }
           }}
           className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all active:scale-95 disabled:opacity-50"
           title="解散群组"
         >
           <Trash2 size={14} />
         </button>

         <button 
           disabled={isRunning}
           onClick={async () => {
             if (groupData) {
               await runTask('保存群组', async () => {
                 await saveGroupToCloud(groupData);
                 setShowGroupSettings(false);
               }, { showSuccessToast: true, silent: true });
             } else {
               setShowGroupSettings(false);
             }
           }}
           className="px-3 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-white text-indigo-600 hover:bg-slate-50 shadow-md transition-all font-black text-xs active:scale-95 disabled:opacity-50"
           title="保存并关闭"
         >
           {isRunning ? '保存中...' : '保存'}
         </button>

         <button 
           onClick={() => setShowGroupSettings(false)}
           className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all active:scale-95"
           title="关闭"
         >
           <X size={16} />
         </button>
      </div>
    </SheetHeader>
  );
};
