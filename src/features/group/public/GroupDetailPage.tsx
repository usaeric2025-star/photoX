import React, { useState } from 'react';
import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import { useGroupData } from '../shared/hooks/useGroupData';
import { Photo, Group } from '@/types';
import { PublicPhotoCard } from '@/components/photo/PublicPhotoCard';
import { YarlLightbox } from '@/components/lightbox/YarlLightbox';
import { useFilters, useTranslation, useCategories } from '@/hooks';
import { getTranslatedCategoryName } from '@/services/category/utils';
import { GroupHeader } from '../shared/components/GroupHeader';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { Button } from '@/components/shared/Button';

function PublicPhotoGrid({ photos, onPhotoClick }: { photos: Photo[]; onPhotoClick: (id: string) => void }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 sm:gap-2 p-1 sm:p-2 lg:p-4">
      {photos.map((photo) => (
        <PublicPhotoCard
          key={photo.id}
          photo={photo}
          onClick={() => onPhotoClick(photo.id)}
          hideGroupBadge={true}
        />
      ))}
    </div>
  );
}

export function PublicGroupDetailPage() {
  const routerSafe = useRouterSafe();
  const { groupId: fGroupId, photoId, setPhotoId } = useFilters();
  const groupId = (routerSafe.params as { groupId?: string }).groupId || fGroupId;
  
  const { group, photos, totalCount, loading, error } = useGroupData({ groupId, isAdmin: false });

  const lightboxIndex = React.useMemo(() => {
    if (!photoId) return -1;
    return photos.findIndex((p: Photo) => p.id === photoId);
  }, [photoId, photos]);

  const lightboxOpen = lightboxIndex !== -1;
  
  const { lang, uiTranslations: t } = useTranslation();
  const { data: categories = [] } = useCategories();
  
  const lightboxItems = photos.map((p: Photo) => {
    const catName = p.category_id ? getTranslatedCategoryName(String(p.category_id), categories, lang, t) : '';
    return {
      id: p.id,
      src: p.image_url,
      thumbnail: p.thumbnail_sm_url || p.image_url,
      title: p.name?.[lang as 'zh'] || p.item_code || '',
      description: p.description?.[lang as 'zh'] || '',
      category: catName,
      tags: p.tags?.map((tag) => tag.name) || [],
      photo: p,
    };
  });

  if (loading) return <PageSkeleton />;
  if (error) return <div className="p-4 text-red-500">錯誤：{error}</div>;
  if (!group) return <div className="p-4 flex flex-col justify-center items-center h-full"><div className="text-xl text-slate-500 mb-4">合組不存在或已被刪除</div><Button onClick={() => window.history.back()}>返回</Button></div>;
  
  return (
    <div className="min-h-screen bg-slate-50 group-detail-public flex flex-col relative w-full h-[100dvh] overflow-hidden overscroll-none">
      <div className="flex-shrink-0 z-10 sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <GroupHeader 
          group={group} 
          photoCount={totalCount} 
          isAdmin={false} 
        />
      </div>
      <div className="flex-1 overflow-y-auto relative overscroll-y-auto overscroll-x-none bg-slate-50">
        <PublicPhotoGrid photos={photos} onPhotoClick={(id: string) => {
             setPhotoId(id);
        }} />
      </div>
      <YarlLightbox
        open={lightboxOpen}
        items={lightboxItems}
        currentIndex={Math.max(0, lightboxIndex)}
        onClose={() => setPhotoId(null)}
        onIndexChange={(idx: number) => {
           const photo = photos[idx];
           if (photo) setPhotoId(photo.id);
        }}
      />
    </div>
  );
}
