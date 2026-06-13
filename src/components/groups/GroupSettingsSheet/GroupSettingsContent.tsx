import React from "react";
import { ProductGroup, Dimension } from "../../../types";
import { UIStoreState } from "@/store/useUIStore";
import { SeriesIdentitySection } from "./sections/SeriesIdentitySection";
import { SeriesDNASection } from "./sections/SeriesDNASection";

export function GroupSettingsContent({
  groupData,
  setGroupData,
  handleUpdateGroupData,
  handleBatchUpdateDimensions,
  update}: {
  groupData: ProductGroup | null;
  setGroupData: React.Dispatch<React.SetStateAction<ProductGroup | null>>;
  handleUpdateGroupData: (updates: Partial<ProductGroup>) => Promise<void>;
  handleBatchUpdateDimensions: (newDims: Dimension[]) => Promise<void>;
  update: (updates: Partial<UIStoreState> | ((state: UIStoreState) => Partial<UIStoreState>)) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
      <SeriesIdentitySection 
        groupData={groupData}
        setGroupData={setGroupData}
        handleUpdateGroupData={handleUpdateGroupData}
      />
      
      <SeriesDNASection 
        groupData={groupData}
        handleUpdateGroupData={handleUpdateGroupData}
      />
    </div>
  );
}
