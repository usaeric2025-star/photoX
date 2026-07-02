import React from 'react';
import { NativeDialog } from "#src/components/ui/NativeDialog.js";
import { ProductGroup, Dimension } from '#src/types/index.js';
import { useAdminMode } from '#src/hooks/index.js';
import { Input } from "#src/components/shared/Input.js";
import { useConfirm } from '#src/context/ConfirmContext.js';
import { Button } from "#src/components/shared/Button.js";
import { Icon } from '#src/components/ui/Icon.js';

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
  t: (key: string) => string;
}

function GroupSettingsHeader({ groupData, activeGroupId, onUngroup, setShowGroupSettings, t }: GroupSettingsHeaderProps) {
  const confirm = useConfirm();
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <h3 className="text-lg font-bold">{t('groupSettings')}</h3>
      <div className="flex gap-2 items-center">
        {onUngroup && activeGroupId && (
          <Button variant="outline" className="text-red-500 hover:text-red-600 hover:bg-red-50" size="sm" onClick={async () => {
            if (await confirm({
              title: t('confirmDissolve'),
              description: t('dissolveDesc'),
              confirmText: t('dissolveBtn'),
              variant: "destructive"
            })) {
              await onUngroup(activeGroupId);
              setShowGroupSettings(false);
            }
          }}>
            <Icon name="trash-2" className="w-4 h-4 mr-1" />
            {t('dissolveGroupBtn')}
          </Button>
        )}
        <button onClick={() => setShowGroupSettings(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <Icon name="x" className="w-5 h-5 text-slate-500" />
        </button>
      </div>
    </div>
  );
}

interface GroupSettingsContentProps {
  groupData: ProductGroup | null;
  handleUpdateGroupData: (updates: Partial<ProductGroup>) => Promise<void>;
  t: (key: string) => string;
}

function GroupSettingsContent({ groupData, handleUpdateGroupData, t }: GroupSettingsContentProps) {
  if (!groupData) return <div className="p-4 text-slate-500 text-center">{t('failedLoadGroupData')}</div>;
  
  return (
    <div className="p-4 space-y-6 overflow-y-auto">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{t('groupName')}</label>
        <input
          type="text"
          value={groupData.name || ''}
          onChange={(e) => handleUpdateGroupData({ name: e.target.value })}
          className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border"
          placeholder={t('groupNamePlaceholder')}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{t('groupDesc')}</label>
        <textarea
          value={groupData.description || ''}
          onChange={(e) => handleUpdateGroupData({ description: e.target.value })}
          rows={4}
          className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border"
          placeholder={t('descPlaceholder')}
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
    t: childProps.t,
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

