import React, { useState } from 'react';
import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import { useGroupData } from '../shared/hooks/useGroupData';
import { Group } from '@/types';
import { PublicPhotoCard } from '@/components/photo/PublicPhotoCard';
import { YarlLightbox } from '@/components/lightbox/YarlLightbox';
import { useFilters, useTranslation, useCategories } from '@/hooks';
import { getTranslatedCategoryName } from '@/services/category/utils';
import { GroupHeader } from '../shared/components/GroupHeader';

function PublicPhotoGrid({ photos, onPhotoClick }: { photos: any[]; onPhotoClick: (id: string) => void }) {
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
  const { groupId: fGroupId, setPhotoId } = useFilters();
  const groupId = (routerSafe.params as any).groupId || fGroupId;
  
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const { group, photos, totalCount, loading, error } = useGroupData({ groupId, isAdmin: false });
  
  const { lang, uiTranslations: t } = useTranslation();
  const { data: categories = [] } = useCategories();
  
  const lightboxItems = photos.map((p: any) => {
    const catName = p.category_id ? getTranslatedCategoryName(String(p.category_id), categories, lang, t) : '';
    return {
      id: p.id,
      src: p.image_url,
      thumbnail: p.thumbnail_sm_url || p.image_url,
      title: p.name?.[lang as 'zh'] || p.item_code || '',
      description: p.description?.[lang as 'zh'] || '',
      category: catName,
      tags: p.tags?.map((tag: any) => tag.name) || [],
      photo: p,
    };
  });

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
        <PublicPhotoGrid photos={photos} onPhotoClick={(id: string) => {
             const index = photos.findIndex((p: any) => p.id === id);
             if (index !== -1) {
               setLightboxIndex(index);
               setLightboxOpen(true);
             }
        }} />
      </div>
      <YarlLightbox
        open={lightboxOpen}
        items={lightboxItems}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}
