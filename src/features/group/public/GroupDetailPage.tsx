import React, { useState } from 'react';
import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import { useGroupData } from '../shared/hooks/useGroupData';
import { Group } from '@/types';
import { PhotoCard } from '@/components/photo/PhotoCard';
import { Lightbox } from '@/components/lightbox/Lightbox';
import { useFilters } from '@/hooks';
import { GroupHeader } from '../shared/components/GroupHeader';

function PublicPhotoGrid({ photos, onPhotoClick }: { photos: any[]; onPhotoClick: (id: string) => void }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 sm:gap-2 p-1 sm:p-2 lg:p-4">
      {photos.map((photo, index) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          index={index}
          onClick={() => onPhotoClick(photo.id)}
          hideGroupBadge={true}
        />
      ))}
    </div>
  );
}

export function PublicGroupDetailPage() {
  const routerSafe = useRouterSafe();
  const { groupId: fGroupId, setPhotoId } = useFilters();
  const groupId = (routerSafe.params as any).groupId || fGroupId;
  
  const { group, photos, totalCount, loading, error } = useGroupData({ groupId, isAdmin: false });
  
  if (loading) return <div className="p-8 text-center text-slate-500">載入中...</div>;
  if (error) return <div className="p-4 text-red-500">錯誤：{error}</div>;
  if (!group) return <div className="p-4">合組不存在</div>;
  
  return (
    <div className="min-h-screen bg-slate-50 group-detail-public flex flex-col relative w-full h-[100dvh] overflow-hidden overscroll-none">
      <div className="flex-shrink-0 z-10 sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <GroupHeader 
          group={group} 
          photoCount={totalCount || group.member_count} 
          isAdmin={false} 
        />
      </div>
      <div className="flex-1 overflow-y-auto relative overscroll-y-auto overscroll-x-none bg-slate-50">
        <PublicPhotoGrid photos={photos} onPhotoClick={setPhotoId} />
      </div>
    </div>
  );
}
