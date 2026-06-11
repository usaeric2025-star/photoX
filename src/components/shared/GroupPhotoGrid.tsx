import React from "react";
import { VList } from "virtua";
import { PhotoCard } from "@/components/photo/PhotoCard";
import { Photo } from "@/types";

interface GroupPhotoGridProps {
  photos: Photo[];
  selectable?: boolean;
  selectedIds?: Set<string>;
  onPhotoClick?: (photo: Photo) => void;
  onSelectionChange?: (ids: Set<string>) => void;
}

export const GroupPhotoGrid = ({
  photos,
  selectable = false,
  selectedIds = new Set(),
  onPhotoClick,
  onSelectionChange,
}: GroupPhotoGridProps) => {
  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  return (
    <VList data={photos} itemSize={200}>
      {(photo, index) => (
        <PhotoCard
          key={photo.id}
          index={index}
          photo={photo}
          selected={selectable && selectedIds.has(photo.id)}
          onSelect={
            selectable && onSelectionChange
              ? () => onSelectionChange(toggle(selectedIds, photo.id))
              : undefined
          }
          onClick={() => onPhotoClick?.(photo)}
        />
      )}
    </VList>
  );
};
