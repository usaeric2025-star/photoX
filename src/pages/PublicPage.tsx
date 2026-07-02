import React, { useMemo, useState } from 'react';
import { useFilters } from '#src/features/filters/index.js';
import { useTranslation } from '#src/hooks/index.js';
import { PublicHeader } from '#src/components/layouts/headers/PublicHeader.js';
import { FilterBar } from '#src/features/filters/index.js';
import { PhotoWall } from '#src/features/photo-wall/index.js';
import { ErrorBoundary } from '#src/components/shared/ErrorBoundary.js';
import { useUI, type UIStoreState } from '#lib/store/index.js';
import { WhatsAppDialog } from '#src/components/shared/WhatsAppDialog.js';
import { Icon } from '#src/components/ui/Icon.js';

export default function PublicPage() {
  const { 
    category, 
    tags, 
    search, 
    sort, 
    showGroupsCollapsed,
  } = useFilters();
  
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const filters = useMemo(() => ({
    categoryId: (category && category !== 'all' && category !== '') ? category : undefined,
    tagId: (tags && tags.length > 0) ? tags[0] : undefined,
    searchQuery: search || undefined,
    sortOrder: sort || undefined,
    onlyGroupsCover: showGroupsCollapsed
  }), [category, tags, search, sort, showGroupsCollapsed]);
  
  const showWhatsAppChoice = useUI((s: UIStoreState) => s.showWhatsAppChoice);
  const patch = useUI(s => s.patch);
  const { uiTranslations: t } = useTranslation();

  return (
    <div 
      className="flex flex-col h-full w-full bg-surface-base relative overflow-hidden" 
      id="public-view"
    >
      <PublicHeader />

      <FilterBar mode="public" className="border-b shadow-sm" />

      <div className="flex-1 min-h-0 relative bg-surface-soft overflow-y-auto">
        <ErrorBoundary>
          <PhotoWall 
            mode="public"
            filters={filters}
          />
        </ErrorBoundary>
      </div>

      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        <button
          onClick={() => {
            patch({ showWhatsAppChoice: true, pendingPhotoId: null });
          }}
          type="button"
          className="w-12 h-12 flex items-center justify-center rounded-full bg-success text-text-on-primary shadow-lg hover:opacity-90 transition-all active:scale-90 focus:outline-none"
          title={t.whatsAppInquiry}
        >
          <Icon name="message-circle" size={26} solid />
        </button>
      </div>

      <WhatsAppDialog 
        open={showWhatsAppChoice} 
        onOpenChange={(val) => patch({ showWhatsAppChoice: val })} 
      />
    </div>
  );
}
