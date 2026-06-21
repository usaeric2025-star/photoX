import React from "react";
import { VList } from "virtua";
import { AdminPhotoCard } from "@/components/photo/AdminPhotoCard";
import { PublicPhotoCard } from "@/components/photo/PublicPhotoCard";
import { useIsManagement } from "@/hooks";
import { PhotoListItem } from '@/types/api';
import { Photo, Category } from "@/types";

interface GroupPhotoGridProps {
  photos: PhotoListItem[];
  selectable?: boolean;
  selectedIds?: Set<string>;
  onPhotoClick?: (photo: PhotoListItem) => void;
  onSelectionChange?: (ids: Set<string>) => void;
  sharedCategories?: Category[];
}

export const GroupPhotoGrid = ({
  photos,
  selectable = false,
  selectedIds = new Set(),
  onPhotoClick,
  onSelectionChange,
  sharedCategories,
}: GroupPhotoGridProps) => {
  const isManagement = useIsManagement();
  
  return (
    <VList data={photos} itemSize={200} shift={true}>
      {(photo) => {
        if (isManagement) {
          return (
            <AdminPhotoCard
              key={photo.id}
              photo={photo}
              sharedCategories={sharedCategories}
              selected={selectable && selectedIds.has(photo.id)}
              onClick={() => onPhotoClick?.(photo)}
            />
          );
        }
        return (
          <PublicPhotoCard
            key={photo.id}
            photo={photo}
            sharedCategories={sharedCategories}
            onClick={() => onPhotoClick?.(photo)}
          />
        );
      }}
    </VList>
  );
};
