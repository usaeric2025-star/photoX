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
} from "@/lib/utils/stringHelper";
import { fromThrowableAsync } from '@/lib/errorFactory';
import { toast } from 'sonner';
import { useFeedback, useInvalidatePhotos, useTaskExecutor } from "@/hooks";

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
  const { handleError, showSuccess, showError } = useFeedback();
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

  const debouncedSave = useCallback(
    (newSettings: AppSettings) => {
      if (saveTimer) clearTimeout(saveTimer);
      const timer = setTimeout(() => {
        saveSettings(newSettings).catch((err) =>
          handleError(err, "保存设置失败"),
        );
        setHasChanges(false);
      }, 1500);
      setSaveTimer(timer);
    },
    [saveSettings, saveTimer, handleError],
  );

  const handleDeduplicate = useCallback(async () => {
    if (!user) {
      handleError(new Error("请先登录云端"), "操作失败");
      return;
    }

    update({
      alertDialog: {
        title: "确认执行排重清理吗？",
        message:
          "系统将扫描云端数据库，保留最早上传的版本，删除重复的照片记录。此操作不可撤销。",
        confirmLabel: "执行排重",
          onConfirm: async () => {
            update({ alertDialog: null });
            const result = await deduplicatePhotos(user.id);
            if (result.ok) {
              const { removed } = result.data;
              if (removed > 0) {
                await performPullSync();
                showSuccess(`排重完成！共清理了 ${removed} 张重复记录。`);
              } else {
                showSuccess("扫描完毕，未发现重复记录。");
              }
            } else {
              handleError(result.error, "排重失败");
            }
          },
      },
    });
  }, [user, update, performPullSync, handleError, showSuccess]);

  const handleHealthCheck = useCallback(
    async (allPhotos: Photo[]) => {
      try {
        showSuccess("正在启动系统级一致性巡检...", true);

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
          showSuccess(
            `合组一致性修复：解散孤立组 ${groupRepair.dissolved} 个，同步计数 ${groupRepair.synced} 个，清理空组 ${groupRepair.deleted} 个`,
          );
        }

        // 3. Storage Audit (Orphans and missing files)
        const auditResp = await fetch("/api/storage/audit");
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
                    showSuccess("正在清理存储空间...", true);
                    const cleanResp = await fetch("/api/storage/clean", {
                      method: "POST",
                    });
                    const cleanData = await cleanResp.json();
                    if (cleanData.success) {
                      showSuccess(
                        `清理完成！共删除 ${cleanData.data.cleanedCount} 个文件。`,
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
          showSuccess("系统诊断完成：所有照片健康度良好");
          return;
        }

        // 3. Otherwise perform the auto-repair loop
        let backfilledCount = 0;
        await backfillThumbHashes((stats) => {
          backfilledCount = stats.success;
        });

        if (backfilledCount > 0) {
          invalidatePhotos();
          showSuccess(
            `诊断修复完成，成功回填 ${backfilledCount} 张照片的占位图！`,
          );
        } else {
          showSuccess("诊断完成：未发现需要修复的项目");
        }
      } catch (err: any) {
        handleError(err, "诊断失败");
      }
    },
    [handleError, showSuccess, invalidatePhotos, showError],
  );

  const togglePin = useCallback(
    (tagId: string) => {
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
    },
    [settings, setSettings, debouncedSave],
  );

  const setSettingField = useCallback(
    <K extends keyof AppSettings>(field: K, value: AppSettings[K]) => {
      const current = settings || {};
      const newSettings = { ...current, [field]: value };
      setSettings(newSettings);
      setHasChanges(true);
      debouncedSave(newSettings);
    },
    [settings, setSettings, debouncedSave],
  );

  const testConnection = useCallback(async () => {
    if (!settings?.gemini_api_key) return;
    setTestResult({ loading: true });

    try {
      const provider = (settings as any).ai_provider || "google";
      const model =
        settings.custom_model || "Gemini 2.5 Flash Lite Preview 09-2025";
      const ok = await testAiConnection(
        settings.gemini_api_key,
        provider,
        model,
      );
      if (ok) {
        setTestResult({ success: true });
        showSuccess("测试成功：AI 服务连接正常！");
      } else {
        setTestResult({ success: false, error: "连接失败" });
      }
    } catch (e: any) {
      setTestResult({ success: false, error: e.message });
      handleError(e, "连接失败");
    } finally {
      setTestResult((prev) => (prev ? { ...prev, loading: false } : null));
    }
  }, [settings, showSuccess, handleError]);

  return {
    testResult,
    setTestResult,
    hasChanges,
    setHasChanges,
    activeTagMenuId,
    setActiveTagMenuId,
    debouncedSave,
    testConnection,
    handleDeduplicate,
    handleHealthCheck,
    togglePin,
    setSettingField,
  };
};
