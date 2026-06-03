import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { ISSUE_ACTIONS } from "@/features/maintenance/issueActions";
import { PreviewResult } from "@/features/maintenance/maintenanceTypes";
import { toast } from "sonner";
import { Loader2, ShieldAlert } from "lucide-react";

interface MaintenanceToolProps {
  issueId: string;
  title?: string;
  description?: string;
  danger?: boolean;
  onSuccess?: () => void;
  compact?: boolean;
}

/**
 * [ATOMIC-COMPONENT] MaintenanceTool
 * Unified maintenance tool with preview and progress tracking.
 */
export const MaintenanceTool = ({ issueId, title, description, danger, onSuccess, compact }: MaintenanceToolProps) => {
  const action = ISSUE_ACTIONS[issueId];
  const finalTitle = title || action?.name || "未知工具";
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!action) return null;

  const handlePreview = async () => {
    setIsPreviewing(true);
    try {
      const result = await action.preview();
      setPreview(result);
    } catch (e: any) {
      toast.error(`预检失败: ${e.message}`);
    } finally {
      setIsPreviewing(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    if (!action.getStatus) {
      setProgress(100);
      setIsExecuting(false);
      return;
    }

    const interval = setInterval(async () => {
      try {
        const status = await action.getStatus!(jobId);
        setProgress(status.progress);
        
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(interval);
          setIsExecuting(false);
          if (status.status === 'completed') {
            toast.success(status.message || "执行成功");
            if (onSuccess) onSuccess();
          } else {
            toast.error(status.error || "执行失败");
          }
          setTimeout(() => setProgress(0), 2000);
        }
      } catch (e) {
        clearInterval(interval);
        setIsExecuting(false);
        toast.error("轮询状态失败");
      }
    }, 2000);
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    setProgress(5);
    try {
      const { jobId, message } = await action.execute();
      if (jobId === 'sync' || jobId === 'cleanup') {
        setProgress(100);
        toast.success(message || "执行完成");
        setIsExecuting(false);
        if (onSuccess) onSuccess();
        setTimeout(() => setProgress(0), 1000);
      } else {
        await pollJobStatus(jobId);
      }
      setPreview(null);
    } catch (e: any) {
      toast.error(`启动执行失败: ${e.message}`);
      setIsExecuting(false);
      setProgress(0);
    }
  };

  const onExecuteClick = () => {
    if (danger) {
      setShowConfirm(true);
    } else {
      handleExecute();
    }
  };

  if (compact) {
    return (
      <>
        <div className="flex items-center gap-1.5 shrink-0">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePreview}
              disabled={isPreviewing || isExecuting}
              className="text-[11px] h-7 px-2.5 font-medium border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 transition-all shrink-0"
            >
              {isPreviewing ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : null}
              {preview ? "已预检" : "预览"}
            </Button>
            <Button 
              variant={danger ? "destructive" : "default"} 
              size="sm"
              onClick={onExecuteClick} 
              disabled={isExecuting || isPreviewing}
              className={`text-[11px] h-7 px-2.5 font-medium rounded-lg transition-all shrink-0 ${danger ? "" : "bg-slate-900 text-white hover:bg-slate-800"}`}
            >
              {isExecuting ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : null}
              {isExecuting ? `${progress}%` : "修复"}
            </Button>
        </div>

        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认执行操作？</AlertDialogTitle>
              <AlertDialogDescription>
                你正在尝试执行「{finalTitle}」。此操作可能不可逆。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction 
                variant="destructive" 
                onClick={() => {
                  setShowConfirm(false);
                  handleExecute();
                }}
              >
                确定执行
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 hover:border-brand-navy/10 transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-brand-navy uppercase tracking-tight">{finalTitle}</h3>
              {danger && <ShieldAlert size={14} className="text-red-500" />}
            </div>
            {description && <p className="text-xs text-slate-500">{description}</p>}
          </div>
          
          <div className="flex gap-2 shrink-0">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePreview}
              disabled={isPreviewing || isExecuting}
              className="text-xs h-8 px-3.5 font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all"
            >
              {isPreviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              预览范围
            </Button>
            <Button 
              variant={danger ? "destructive" : "default"} 
              size="sm"
              onClick={onExecuteClick} 
              disabled={isExecuting || isPreviewing}
              className={`text-xs h-8 px-3.5 font-medium rounded-xl transition-all ${danger ? "" : "bg-slate-900 text-white hover:bg-slate-800"}`}
            >
              {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              {isExecuting ? "执行中" : "开始执行"}
            </Button>
          </div>
        </div>

        {preview && (
          <Alert className="bg-blue-50 border-blue-100 py-2.5">
            <AlertDescription className="text-[10px] font-bold text-blue-700 flex items-center justify-between">
              <span>即将影响 {preview.affectedCount} 项数据记录</span>
              <button 
                onClick={() => setPreview(null)}
                className="opacity-50 hover:opacity-100 transition-opacity"
              >
                清除
              </button>
            </AlertDescription>
          </Alert>
        )}

        {isExecuting && progress > 0 && (
          <div className="space-y-1.5 animate-in slide-in-from-top-2">
            <div className="flex justify-between text-[9px] font-black text-brand-navy/40 uppercase">
              <span>处理进度</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        )}
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认执行操作？</AlertDialogTitle>
            <AlertDialogDescription>
              你正在尝试执行「{finalTitle}」。这是一个危险操作，可能导致数据不可逆的更改，请确保你已经通过预览确认了影响范围。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              variant="destructive" 
              onClick={() => {
                setShowConfirm(false);
                handleExecute();
              }}
            >
              确定执行
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
