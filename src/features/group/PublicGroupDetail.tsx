import React, { useRef } from 'react';
import { logger } from '@/lib/logger';
import { useAppRouter } from '@/lib/router';
import { useGroupData } from './hooks/useGroupData';
import { PhotoListItem } from '@/types/api';
import { Photo, Group, Category } from '@/types';
import { PublicPhotoCard } from '@/components/photo/PublicPhotoCard';
import { useLightbox, photosToLightboxSlides } from '@/lib/lightbox';
import { useFilters, useTranslation, useCategories } from '@/hooks';
import { GroupHeader } from './components/GroupHeader';
import { Button } from '@/components/shared/Button';
import { useUI, uiStore, useSignal, gridColumns as gridColumnsSignal } from '@/lib/store';
import { usePublicSettings } from '@/hooks/settings/useSettings';
import { WhatsAppDialog } from '@/components/shared/WhatsAppDialog';
import { useColumns } from '@/hooks';
import { FilterBar } from '@/features/filters';

function PublicPhotoGrid({ photos, categories, onPhotoClick }: { photos: PhotoListItem[]; categories?: Category[]; onPhotoClick: (id: string, index: number) => void }) {
  const columns = useSignal(gridColumnsSignal);
  
  return (
    <div 
      className="grid gap-1 p-1"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {photos.map((photo, index) => (
        <div key={photo.id} className="min-w-0">
         <PublicPhotoCard
          photo={photo}
          onClick={() => onPhotoClick(photo.id, index)}
          hideGroupBadge={true}
          sharedCategories={categories}
        />
        </div>
      ))}
    </div>
  );
}

export function PublicGroupDetailPage() {
  const { params } = useAppRouter();
  const { groupId: fGroupId, photoId, setPhotoId } = useFilters();
  const groupId = ((params as { slug?: string }).slug) || fGroupId;
  
  const [anchor, setAnchor] = React.useState(true);
  const { data: categories } = useCategories();
  const { lang, uiTranslations: t } = useTranslation();
  
  const { group, photos: rawPhotos, totalCount, loading, error } = useGroupData({ groupId, isAdmin: false });

  const photos = React.useMemo(() => rawPhotos || [], [rawPhotos]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const showWhatsAppChoice = useUI(s => s.showWhatsAppChoice);
  const patchUI = useUI(s => s.patch);
  const openLightbox = useUI(s => s.openLightbox);
  const { data: settings } = usePublicSettings();
  const lightboxItems = React.useMemo(() => photosToLightboxSlides(photos), [photos]);

  // Sync lightbox items to store when they change
  React.useEffect(() => {
    if (lightboxItems.length > 0) {
      uiStore.setState({ lightboxSlides: lightboxItems });
    }
  }, [lightboxItems]);

  // Anchoring effect
  React.useEffect(() => {
    if (anchor && photoId && !loading && photos.length > 0) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const element = document.querySelector(`[data-photo-id="${photoId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add a temporary highlight effect 
          element.classList.add('ring-4', 'ring-primary', 'scale-95');
          setTimeout(() => {
             element.classList.remove('ring-4', 'ring-primary', 'scale-95');
             // Clear anchor from URL so it doesn't trigger again on reload
             setAnchor(false);
          }, 2000);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [anchor, photoId, loading, photos.length]);

  const handlePhotoClick = (id: string, index: number) => {
      openLightbox(lightboxItems, index);
  };

  const handleScrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openWhatsApp = () => {
    (window as unknown as { _pendingPhoto?: PhotoListItem })._pendingPhoto = undefined;
    patchUI({ showWhatsAppChoice: false });
  };

  const getWhatsAppOptions = () => {
    const options: { name: string; url: string }[] = [];
    const pendingPhoto = (window as unknown as { _pendingPhoto?: PhotoListItem })._pendingPhoto;
    let message = '';
    
    if (pendingPhoto) {
      const prompt = t.sharePrompt || "您好，我对这个家具感兴趣：";
      const name = pendingPhoto.name || "";
      const url = pendingPhoto.imageUrl || "";
      message = `${prompt}\n*${name}*\n${url}`;
    } else {
      const groupName = group?.name || '';
      message = `您好，我對合組 *${groupName}* 很感興趣，想了解更多信息！`;
    }
    
    const encodedText = encodeURIComponent(message);
    
    if (settings?.whatsapp_1) {
      options.push({ name: settings.whatsapp_1_name || 'Contact 1', url: `https://wa.me/${settings.whatsapp_1}?text=${encodedText}` });
    }
    if (settings?.whatsapp_2) {
      options.push({ name: settings.whatsapp_2_name || 'Contact 2', url: `https://wa.me/${settings.whatsapp_2}?text=${encodedText}` });
    }
    
    if (options.length === 0) {
      const fallback = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_WHATSAPP_NUMBER : '';
      if (fallback) {
        options.push({ name: t.whatsAppInquiry, url: `https://wa.me/${fallback}?text=${encodedText}` });
      }
    }
    
    return options;
  };

  if (loading) {
    return (
      <div className="p-1 sm:p-2 lg:p-4 w-full h-full">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 sm:gap-2">
           {Array.from({ length: 18 }).map((_, i) => (
             <div key={i} className="aspect-square w-full bg-surface-soft rounded-xl border border-border-soft animate-shimmer" />
           ))}
        </div>
      </div>
    );
  }
  if (error) return <div className="p-4 text-red-500">錯誤：{error}</div>;
  if (!group) return <div className="p-4 flex flex-col justify-center items-center h-full"><div className="text-xl text-slate-500 mb-4">合組不存在或已被刪除</div><Button onClick={() => window.history.back()}>返回</Button></div>;
  
  return (
    <div className="min-h-screen bg-slate-50 group-detail-public flex flex-col relative w-full h-[100dvh] overflow-hidden overscroll-none">
      <div className="flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm relative">
        <GroupHeader 
          group={group} 
          photoCount={totalCount} 
          isAdmin={false} 
        />
      </div>
      {/* FilterBar removed */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative overscroll-y-auto overscroll-x-none bg-slate-50">
        <PublicPhotoGrid photos={photos} categories={categories} onPhotoClick={handlePhotoClick} />
      </div>
    </div>
  );
}
