import React from 'react';
import { NativeDialog } from "../ui/NativeDialog";
import { ProductGroup, Dimension } from '../../types';
import { useAdminMode } from '../../hooks';
import { MultilingualInput } from "../shared/MultilingualInput";
import { Input } from "../shared/Input";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Button } from "../shared/Button";
import { Icon } from '@/components/ui/Icon';
import { useDisclosure } from "../../hooks/core/useDisclosure";

interface GroupSettingsDialogProps {
  showGroupSettings: boolean;
  setShowGroupSettings: (show: boolean) => void;
  activeGroupId: string | null;
  groupData: ProductGroup | null;
  setGroupData: React.Dispatch<React.SetStateAction<ProductGroup | null>>;
  onUngroup?: (groupId: string) => Promise<void> | void;
  update?: (updates: Partial<ProductGroup>) => Promise<void>;
  handleUpdateGroupData: (updates: Partial<ProductGroup>) => Promise<void>;
  t: (key: string) => string;
}

interface GroupSettingsHeaderProps {
  groupData: ProductGroup | null;
  activeGroupId: string | null;
  onUngroup?: (groupId: string) => Promise<void> | void;
  setShowGroupSettings: (show: boolean) => void;
}

function GroupSettingsHeader({ groupData, activeGroupId, onUngroup, setShowGroupSettings }: GroupSettingsHeaderProps) {
  const [isOpen, { open, close }] = useDisclosure();
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <h3 className="text-lg font-bold">合組設定</h3>
      <div className="flex gap-2 items-center">
        {onUngroup && activeGroupId && (
          <Button variant="outline" className="text-red-500 hover:text-red-600 hover:bg-red-50" size="sm" onClick={open}>
            <Icon name="trash-2" className="w-4 h-4 mr-1" />
            解散合組
          </Button>
        )}
        <button onClick={() => setShowGroupSettings(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <Icon name="x" className="w-5 h-5 text-slate-500" />
        </button>
      </div>
      <ConfirmDialog
        open={isOpen}
        onOpenChange={(val) => !val && close()}
        title="確認解散合組？"
        description="解散後，其中的照片將成為獨立照片。此操作無法復原。"
        onConfirm={async () => {
          if (onUngroup && activeGroupId) {
            await onUngroup(activeGroupId);
            setShowGroupSettings(false);
          }
        }}
        confirmText="解散"
        variant="destructive"
      />
    </div>
  );
}

interface GroupSettingsContentProps {
  groupData: ProductGroup | null;
  handleUpdateGroupData: (updates: Partial<ProductGroup>) => Promise<void>;
  t: (key: string) => string;
}

function GroupSettingsContent({ groupData, handleUpdateGroupData, t }: GroupSettingsContentProps) {
  if (!groupData) return <div className="p-4 text-slate-500 text-center">無法載入合組資料</div>;
  
  return (
    <div className="p-4 space-y-6 overflow-y-auto">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">合組名稱</label>
        <input
          type="text"
          value={groupData.name || ''}
          onChange={(e) => handleUpdateGroupData({ name: e.target.value })}
          className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border"
          placeholder="合組名稱..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">合組描述</label>
        <textarea
          value={groupData.description || ''}
          onChange={(e) => handleUpdateGroupData({ description: e.target.value })}
          rows={4}
          className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border"
          placeholder="描述..."
        />
      </div>
    </div>
  );
}

export function GroupSettingsDialog(props: GroupSettingsDialogProps) {
  const isAdminMode = useAdminMode();

  const childProps = {
    ...props,
    isAdminMode
  };

  const headerProps = {
    groupData: childProps.groupData,
    activeGroupId: childProps.activeGroupId,
    onUngroup: childProps.onUngroup,
    setShowGroupSettings: childProps.setShowGroupSettings,
  };

  return (
    <NativeDialog id="group-settings-dialog" open={props.showGroupSettings} onClose={() => props.setShowGroupSettings(false)} size="lg" hidePadding showCloseButton={false}>
      <div className="flex flex-col bg-white overflow-hidden max-h-[85vh] w-full max-w-[500px] h-full sm:h-[800px]">
        <GroupSettingsHeader {...headerProps} />
        <GroupSettingsContent {...childProps} />
      </div>
    </NativeDialog>
  );
};

