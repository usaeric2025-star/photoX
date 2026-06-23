import { useUIStore } from '@/store/uiStore';
import { PhotoLightbox } from '@/features/lightbox/PhotoLightbox';
import { PhotoEditDialog } from '@/features/photo-edit/PhotoEditDialog';
import { lazy, Suspense } from 'react';

/**
 * 集中管理的弹窗容器
 * 优点：
 * 1. 隔离核心渲染路径，避免弹窗重绘影响主视图
 * 2. 实践 AGENTS_md 的全屏对话框注册规范
 */

const DiagnosticsDialog = lazy(() => import("@/components/ui/DiagnosticsDialog").then(m => ({ default: m.DiagnosticsDialog })));
const WhatsAppDialog = lazy(() => import("@/components/shared/WhatsAppDialog").then(m => ({ default: m.WhatsAppDialog })));

export const DialogContainer = () => {
  const { 
    isDiagnosticsOpen, 
    showWhatsAppChoice, 
    isLightboxOpen,
    patch 
  } = useUIStore(s => ({
    isDiagnosticsOpen: s.isDiagnosticsOpen,
    showWhatsAppChoice: s.showWhatsAppChoice,
    isLightboxOpen: s.lightbox.isOpen,
    patch: s.patch
  }));

  return (
    <>
      {isLightboxOpen && <PhotoLightbox />}
      <PhotoEditDialog />
      <Suspense fallback={null}>
        <DiagnosticsDialog 
          open={isDiagnosticsOpen} 
          onClose={() => patch({ isDiagnosticsOpen: false })} 
        />
      </Suspense>
      {showWhatsAppChoice && (
        <Suspense fallback={null}>
          <WhatsAppDialog 
            open={showWhatsAppChoice} 
            onOpenChange={(open) => patch({ showWhatsAppChoice: open })} 
          />
        </Suspense>
      )}
    </>
  );
};
