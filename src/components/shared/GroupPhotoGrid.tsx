import React from "react";
import { VList } from "virtua";
import { PublicPhotoCard } from "@/components/photo/PublicPhotoCard";
import { AdminPhotoCard } from "@/components/photo/AdminPhotoCard";
import { useIsManagement } from "@/hooks";
import { Photo, Category } from "@/types";

interface GroupPhotoGridProps {
  photos: Photo[];
  selectable?: boolean;
  selectedIds?: Set<string>;
  onPhotoClick?: (photo: Photo) => void;
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
  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

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
           )
        }
        return (
          <PublicPhotoCard
            key={photo.id}
            photo={photo}
            sharedCategories={sharedCategories}
            onClick={() => onPhotoClick?.(photo)}
          />
        )
      }}
    </VList>
  );
};
