import React from 'react';
import { Modal } from "../ui/Modal";
import { ProductGroup, Dimension } from '../../types';
import { GroupSettingsHeader } from './GroupSettingsSheet/GroupSettingsHeader';
import { GroupSettingsContent } from './GroupSettingsSheet/GroupSettingsContent';
import { useAdminMode } from '../../hooks';

interface GroupSettingsModalProps {
  showGroupSettings: boolean;
  setShowGroupSettings: (show: boolean) => void;
  activeGroupId: string | null;
  groupData: ProductGroup | null;
  setGroupData: React.Dispatch<React.SetStateAction<ProductGroup | null>>;
  onUngroup?: (groupId: string) => Promise<void> | void;
  update: (updates: any) => void;
  handleUpdateGroupData: (updates: Partial<ProductGroup>) => Promise<void>;
  handleBatchUpdateDimensions: (newDims: Dimension[]) => Promise<void>;
  t: any;
}

export function GroupSettingsModal(props: GroupSettingsModalProps) {
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
    <Modal open={props.showGroupSettings} onClose={() => props.setShowGroupSettings(false)} size="lg" hidePadding showCloseButton={false}>
      <div className="flex flex-col bg-white overflow-hidden max-h-[85vh] w-full max-w-[500px] h-full sm:h-[800px]">
        <GroupSettingsHeader {...headerProps} />
        <GroupSettingsContent {...childProps} />
      </div>
    </Modal>
  );
};
