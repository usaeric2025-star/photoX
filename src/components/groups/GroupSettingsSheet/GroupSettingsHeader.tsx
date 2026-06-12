import { ErrorFactory } from '@/lib/error/ErrorFactory';
import React from "react";
import { Settings2, Trash2, X, Copy } from "lucide-react";
import { SheetHeader, SheetTitle } from "../../ui/sheet";
import { ProductGroup } from "../../../types";
import { useDisclosure } from "@mantine/hooks";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { saveGroup as saveGroupToCloud } from "@/services/group/commands";

import { useTaskExecutor, useTasks, useUrlFilters, useCopyToClipboard } from "@/hooks";
import { toast } from "sonner";

export function GroupSettingsHeader({
  groupData,
  activeGroupId,
  onUngroup,
  setShowGroupSettings}: {
  groupData: ProductGroup | null;
  activeGroupId: string | null;
  onUngroup?: (groupId: string) => Promise<void> | void;
  setShowGroupSettings: (show: boolean) => void;
  
}) {
  const { setGroupId } = useUrlFilters();
  
  const { runTask } = useTaskExecutor();
  const { tasks } = useTasks();
  const isRunning = tasks.some((t) => t.status === "running");
  const [isDissolveOpen, dissolveDialog] = useDisclosure(false);
  const { copy } = useCopyToClipboard({ successMessage: "Group ID copied" });

  return (
    <SheetHeader className="p-4 border-b border-slate-50 bg-indigo-600 text-white space-y-0 flex-row items-center justify-between">
      <div className="flex items-center gap-2">
        <Settings2 size={18} />
        <SheetTitle className="font-black text-sm uppercase tracking-wider text-white m-0">
          合组设置
        </SheetTitle>
        {activeGroupId && (
          <button
            onClick={() => copy(activeGroupId)}
            className="flex items-center gap-1 text-[10px] bg-indigo-500/50 px-1.5 py-0.5 rounded hover:bg-indigo-400/50 transition-colors"
            title="点击复制 ID"
          >
            <span>{activeGroupId.slice(-8)}</span>
            <Copy size={10} />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          disabled={isRunning}
          onClick={dissolveDialog.open}
          className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all active:scale-95 disabled:opacity-50"
          title="解散群组"
        >
          <Trash2 size={14} />
        </button>
        
        <ConfirmDialog
          open={isDissolveOpen}
          onOpenChange={dissolveDialog.toggle}
          title="确认删除"
          description="确定要解散（删除）整个群组吗？此操作不可恢复。"
          confirmText="删除"
          variant="destructive"
          onConfirm={async () => {
            await runTask(
              "解散群组",
              async () => {
                if (onUngroup && activeGroupId) {
                  await onUngroup(activeGroupId);
                  setGroupId(null);
                  setShowGroupSettings(false);
                }
              },
              { showSuccessToast: true, silent: true },
            );
          }}
        />

        <button
          disabled={isRunning}
          onClick={async () => {
            if (groupData) {
              await runTask(
                "保存群组",
                async () => {
                  await saveGroupToCloud(groupData);
                  setShowGroupSettings(false);
                },
                { showSuccessToast: true, silent: true },
              );
            } else {
              setShowGroupSettings(false);
            }
          }}
          className="px-3 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-white text-indigo-600 hover:bg-slate-50 shadow-md transition-all font-black text-xs active:scale-95 disabled:opacity-50"
          title="保存并关闭"
        >
          {isRunning ? "保存中..." : "保存"}
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
}
