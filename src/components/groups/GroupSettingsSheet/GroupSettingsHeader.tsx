import { ErrorFactory } from '@/lib/error/ErrorFactory';
import React from "react";
import { Settings2, Trash2, X, Copy, Check } from "lucide-react";
import { ProductGroup } from "../../../types";
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { saveGroup as saveGroupToCloud } from "@/services/group/commands";

import { useUrlFilters, useCopyToClipboard } from "@/hooks";

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
  
  const [showConfirm, { open, close }] = useDisclosure();
  const { copy, copied } = useCopyToClipboard();

  const handleApplyUngroup = () => {
    if (activeGroupId && onUngroup) {
      onUngroup(activeGroupId);
      close();
    }
  };

  return (
    <>
      <div className="px-6 py-5 border-b border-slate-100 flex flex-row items-center justify-between shrink-0 bg-white">
        <h2 className="flex items-center gap-2.5 text-lg font-bold text-slate-800 tracking-tight m-0">
          <div className="p-1.5 bg-brand-navy rounded-md text-white">
            <Settings2 size={16} strokeWidth={2.5} />
          </div>
          合组编排 / GROUP
        </h2>
        
        <div className="flex items-center gap-1.5">
          {groupData && (
             <button
               onClick={() => copy(groupData.id)}
               className="p-2 -mr-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
               title="复制合组 ID / Copy Group ID"
             >
               {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
             </button>
          )}

          <button
            onClick={() => {
              setShowGroupSettings(false);
              setGroupId(null);
            }}
            className="p-2 -mr-2 rounded-full text-slate-400 hover:bg-slate-100 transition-colors hidden sm:flex"
            title="关闭设置"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={showConfirm}
        onOpenChange={(isOpen) => !isOpen && close()}
        title="解除合组？"
        description="此合组将被物理删除，其包含的所有照片将恢复为独立的散列状态。解除后您也可以随时通过批量勾选重新将这些照片合组。请确认您的操作。"
        confirmText="确定解除 / UNGROUP"
        onConfirm={handleApplyUngroup}
        variant="destructive"
      />
    </>
  );
}
