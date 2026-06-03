import { useState, useCallback } from "react";
import { AppSettings, Tag, Manufacturer, Category, User, Photo } from "@/types";
import { useUIStore, useShallow } from "@/store/useUIStore";
import { testAiConnection } from "@/services/geminiService";
import { getPhotosWithoutThumbHash } from "@/services/photo/queries";
import {
  deduplicatePhotos,
  scanAndRepairPhotoIds,
  repairGroupIntegrity,
} from "@/services/photo/photoMaintenanceService";
import { backfillThumbHashes } from "@/services/photo/backfillService";
import {
  normalizeTagName,
  normalizeManufacturerName,
} from "@/lib/utils";
import { fromThrowableAsync } from '@/lib/errorFactory';
import { toast } from '@/lib/ui/toast';
import { useErrorHandler, useInvalidatePhotos, useTaskExecutor } from "@/hooks";

interface UseSettingsLogicProps {
  user: User | null;
  settings: AppSettings;
  geminiApiKey: string;
  customModel: string;
  saveSettings: (s: AppSettings) => Promise<any>;
  performPullSync: () => Promise<any>;
  setSettings: (s: AppSettings) => void;
}

export const useSettingsLogic = ({
  user,
  settings,
  geminiApiKey,
  customModel,
  saveSettings,
  performPullSync,
  setSettings,
}: UseSettingsLogicProps) => {
  const { update } = useUIStore(useShallow((s) => ({ update: s.update })));
  const { handleError } = useErrorHandler();
  const invalidatePhotos = useInvalidatePhotos();
  const { runTask } = useTaskExecutor();

  const [testResult, setTestResult] = useState<{
    success?: boolean;
    error?: string;
    loading?: boolean;
  } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTagMenuId, setActiveTagMenuId] = useState<string | null>(null);
  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);

  const debouncedSave = (newSettings: AppSettings) => {
    if (saveTimer) clearTimeout(saveTimer);
    const timer = setTimeout(() => {
      saveSettings(newSettings).catch((err) =>
        handleError(err, "保存设置失败"),
      );
      setHasChanges(false);
    }, 1500);
    setSaveTimer(timer);
  };

  const handleHealthCheck = async (allPhotos: Photo[]) => {
    try {
      toast.success("正在啟動系統級一致性巡檢...");

      // 1. Check data consistency (IDs)
      const broken = await scanAndRepairPhotoIds(allPhotos);
      if (broken.length > 0) {
        console.warn(`[HealthCheck] Found ${broken.length} broken IDs`);
      }

      // 2. Repair Group Integrity (The "Orphaned group" and "Member count" fix) - HIGH PRIORITY
      const groupRepair = await repairGroupIntegrity();
      console.log("[HealthCheck] Group repair results:", groupRepair);
      if (
        groupRepair.dissolved > 0 ||
        groupRepair.synced > 0 ||
        groupRepair.deleted > 0
      ) {
        toast.success(
          `合組一致性修復：解散孤立組 ${groupRepair.dissolved} 個，同步計數 ${groupRepair.synced} 個，清理空組 ${groupRepair.deleted} 個`,
        );
      }

      // 3. Storage Audit (Orphans and missing files)
      const auditResp = await fetch("/api/storage/audit");
      if (!auditResp.ok) {
        throw new Error(`存储审计失败 (HTTP ${auditResp.status}): 无法连接存储后端。请确认 R2 容器与 Supabase 凭据配置正确。`);
      }
      const auditContentType = auditResp.headers.get("Content-Type");
      if (!auditContentType || !auditContentType.includes("application/json")) {
        throw new Error(`存储审计失败: 接口未返回有效的 JSON 数据 (${auditResp.status})`);
      }
      const auditData = await auditResp.json();
      if (auditData.success && auditData.data) {
        const { missing, orphans } = auditData.data;
        if (missing > 0 || orphans > 0) {
          console.warn(
            `[Storage Audit] Missing: ${missing}, Orphans: ${orphans}`,
          );
          if (orphans > 0) {
            update({
              alertDialog: {
                title: "发现孤儿文件 / Orphans Found",
                message: `存储空间中发现了 ${orphans} 个不再被数据库使用的文件。是否要清理这些“废弃孤本”以释放空间？`,
                confirmLabel: "立即清理",
                onConfirm: async () => {
                  update({ alertDialog: null });
                  toast.success("正在清理存儲空間...");
                  const cleanResp = await fetch("/api/storage/clean", {
                    method: "POST",
                  });
                  if (!cleanResp.ok) {
                    throw new Error(`清理存储失败 (HTTP ${cleanResp.status})，无法执行深度文件擦除。`);
                  }
                  const cleanContentType = cleanResp.headers.get("Content-Type");
                  if (!cleanContentType || !cleanContentType.includes("application/json")) {
                    throw new Error(`清理存储失败: 返回非 JSON 响应 (${cleanResp.status})`);
                  }
                  const cleanData = await cleanResp.json();
                  if (cleanData.success) {
                    toast.success(
                      `清理完成！共刪除 ${cleanData.data.cleanedCount} 個文件。`,
                    );
                  }
                },
              },
            });
          }
        }
      }

      // 3. Check for missing hashes
      const missingHashes = await getPhotosWithoutThumbHash();

      if (!missingHashes || missingHashes.length === 0) {
        toast.success("系統診斷完成：所有照片健康度良好");
        return;
      }

      // 3. Otherwise perform the auto-repair loop
      let backfilledCount = 0;
      await backfillThumbHashes((stats) => {
        backfilledCount = stats.success;
      });

      if (backfilledCount > 0) {
        invalidatePhotos();
        toast.success(
          `診斷修復完成，成功回填 ${backfilledCount} 張照片的佔位圖！`,
        );
      } else {
        toast.success("診斷完成：未發現需要修復的项目");
      }
    } catch (err: any) {
      handleError(err, "診斷失敗");
    }
  };

  const togglePin = (tagId: string) => {
    const currentPinned = settings?.pinned_tags || [];
    let nextPinned;
    if (currentPinned.includes(tagId)) {
      nextPinned = currentPinned.filter((id: string) => id !== tagId);
    } else {
      nextPinned = [...currentPinned, tagId];
    }
    const nextSettings = { ...settings, pinned_tags: nextPinned };
    setSettings(nextSettings);
    setHasChanges(true);
    debouncedSave(nextSettings);
  };

  const setSettingField = <K extends keyof AppSettings>(field: K, value: AppSettings[K]) => {
    const current = settings || {};
    const newSettings = { ...current, [field]: value };
    setSettings(newSettings);
    setHasChanges(true);
    debouncedSave(newSettings);
  };

  const testConnection = async () => {
    if (!settings?.gemini_api_key) return;
    setTestResult({ loading: true });

    try {
      const provider = (settings as any).ai_provider || "google";
      const model =
        settings.custom_model || 'google/gemini-2.5-flash-lite-preview-09-2025';
      const ok = await testAiConnection(
        settings.gemini_api_key,
        provider,
        model,
      );
      if (ok) {
        setTestResult({ success: true });
        toast.success("測試成功：AI 服務連接正常！");
      } else {
        setTestResult({ success: false, error: "连接失败" });
      }
    } catch (e: any) {
      setTestResult({ success: false, error: e.message });
      handleError(e, "连接失败");
    } finally {
      setTestResult((prev) => (prev ? { ...prev, loading: false } : null));
    }
  };

  return {
    testResult,
    setTestResult,
    hasChanges,
    setHasChanges,
    activeTagMenuId,
    setActiveTagMenuId,
    debouncedSave,
    testConnection,
    handleHealthCheck,
    togglePin,
    setSettingField,
  };
};
