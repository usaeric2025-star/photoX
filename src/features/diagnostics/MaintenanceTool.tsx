import React from 'react';
import { Button } from "@/components/shared/Button";
import { Progress } from "@/components/shared/Progress";
import { Alert, AlertDescription } from "@/components/shared/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ISSUE_ACTIONS } from "@/features/diagnostics/issueActions";
import { Icon } from '@/components/ui/Icon';
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { useUIStore } from '@/store/useUIStore';
import { useTranslation } from '@/hooks';
import { MaintenancePreviewDialog } from './MaintenancePreviewDialog';
import { useMaintenanceExecution } from './useMaintenanceExecution';

interface MaintenanceToolProps {
  issueId: string;
  title?: string;
  description?: string;
  danger?: boolean;
  onSuccess?: () => void;
  compact?: boolean;
}

export const MaintenanceTool = ({ issueId, title, description, danger, onSuccess, compact }: MaintenanceToolProps) => {
  const { uiTranslations } = useTranslation();
  const baseTempTitle = title || ISSUE_ACTIONS[issueId]?.name || uiTranslations.processing || "未知工具";
  const [showConfirm, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);

  const {
    preview, setPreview, showPreviewDialog, setShowPreviewDialog,
    isExecuting, isPreviewing, progress, handlePreview, handleExecute, action
  } = useMaintenanceExecution(issueId, baseTempTitle, onSuccess);

  if (!action) return null;

  const onExecuteClick = () => danger ? openConfirm() : handleExecute();

  const renderSharedModals = () => (
    <>
      <MaintenancePreviewDialog
        open={showPreviewDialog}
        onClose={() => setShowPreviewDialog(false)}
        title={baseTempTitle}
        preview={preview}
        danger={danger}
        onConfirm={onExecuteClick}
      />
      <ConfirmDialog
        open={showConfirm}
        onOpenChange={(isOpened) => {
          isOpened ? useUIStore.getState().incrementDialogCount() : useUIStore.getState().decrementDialogCount();
          isOpened ? openConfirm() : closeConfirm();
        }}
        title="确认执行操作？"
        description={`你正在尝试执行「${baseTempTitle}」。此操作可能不可逆。`}
        onConfirm={() => { closeConfirm(); handleExecute(); }}
        variant="destructive"
        confirmText="确定执行"
      />
    </>
  );

  if (compact) {
    return (
      <>
        <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="outline" size="sm" onClick={handlePreview} disabled={isPreviewing || isExecuting}
              className="text-[11px] h-7 px-2.5 font-medium border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 transition-all shrink-0">
              {isPreviewing && <Icon name="loader-2" className="w-3 h-3 animate-spin mr-1.5" />} {preview ? "已预检" : "预览"}
            </Button>
            <Button variant={danger ? "danger" : "primary"} size="sm" onClick={onExecuteClick} disabled={isExecuting || isPreviewing}
              className={`text-[11px] h-7 px-2.5 font-medium rounded-lg transition-all shrink-0 ${!danger && "bg-slate-900 text-white hover:bg-slate-800"}`}>
              {isExecuting && <Icon name="loader-2" className="w-3 h-3 animate-spin mr-1.5" />} {isExecuting ? `${progress}%` : "修复"}
            </Button>
        </div>
        {renderSharedModals()}
      </>
    );
  }

  return (
    <>
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 hover:border-brand-navy/10 transition-colors w-full">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 w-full">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">{baseTempTitle}</h3>
              {danger && <Icon name="shield-alert" size={14} className="text-red-500 shrink-0" />}
            </div>
            {description && <p className="text-xs text-slate-500 leading-relaxed break-words">{description}</p>}
          </div>
          
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto mt-1 sm:mt-0">
            <Button variant="outline" size="sm" onClick={handlePreview} disabled={isPreviewing || isExecuting}
              className="text-xs h-8 px-3.5 font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all flex-1 sm:flex-initial justify-center">
              {isPreviewing && <Icon name="loader-2" className="w-3.5 h-3.5 animate-spin mr-1.5" />} 预览范围
            </Button>
            <Button variant={danger ? "danger" : "primary"} size="sm" onClick={onExecuteClick} disabled={isExecuting || isPreviewing}
              className={`text-xs h-8 px-3.5 font-semibold rounded-xl transition-all flex-1 sm:flex-initial justify-center ${!danger && "bg-slate-900 text-white hover:bg-slate-800"}`}>
              {isExecuting && <Icon name="loader-2" className="w-3.5 h-3.5 animate-spin mr-1.5" />} {isExecuting ? "执行中" : "开始执行"}
            </Button>
          </div>
        </div>

        {preview && (
          <Alert className="bg-blue-50 border-blue-100 py-2.5">
            <AlertDescription className="text-[10px] font-bold text-blue-700 flex items-center justify-between">
              <span>即将影响 {preview.affectedCount} 项数据记录</span>
              <button onClick={() => setPreview(null)} className="opacity-50 hover:opacity-100 transition-opacity">清除</button>
            </AlertDescription>
          </Alert>
        )}

        {isExecuting && progress > 0 && (
          <div className="space-y-1.5 animate-in slide-in-from-top-2">
            <div className="flex justify-between text-[9px] font-black text-brand-navy/40 uppercase">
              <span>处理进度</span><span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        )}
      </div>
      {renderSharedModals()}
    </>
  );
};
