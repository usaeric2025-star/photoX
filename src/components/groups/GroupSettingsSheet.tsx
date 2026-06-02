import React, { useState } from 'react';
import { Sheet, SheetContent } from "../ui/sheet";
import { ProductGroup, Dimension } from '../../types';
import { AlertDialogProps, PromptDialogProps } from '@/store/useUIStore';
import { GroupSettingsHeader } from './GroupSettingsSheet/GroupSettingsHeader';
import { GroupSettingsContent } from './GroupSettingsSheet/GroupSettingsContent';

import { useAdminMode } from '../../hooks';

interface GroupSettingsSheetProps {
  showGroupSettings: boolean;
  setShowGroupSettings: (show: boolean) => void;
  activeGroupId: string | null;
  groupData: ProductGroup | null;
  setGroupData: React.Dispatch<React.SetStateAction<ProductGroup | null>>;
  onUngroup?: (groupId: string) => void;
  update: (updates: any) => void;
  handleUpdateGroupData: (updates: Partial<ProductGroup>) => Promise<void>;
  handleBatchUpdateDimensions: (newDims: Dimension[]) => Promise<void>;
  
  
  t: any;
}

export function GroupSettingsSheet(props: GroupSettingsSheetProps) {
  const isAdminMode = useAdminMode();

  const childProps = {
    ...props,
    isAdminMode
  };

  return (
    <Sheet open={props.showGroupSettings} onOpenChange={props.setShowGroupSettings}>
      <SheetContent side="right" showCloseButton={false} className="w-full sm:max-w-[400px] p-0 border-l border-slate-100 bg-white">
        <GroupSettingsHeader {...childProps} />
        <GroupSettingsContent {...childProps} />
      </SheetContent>
    </Sheet>
  );
};
