import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { logResult } from '@/lib/error/errorLogger';
import { api } from '@/lib/api';

export type DiagnoseIssue = {
  type: 'orphan_photos' | 'orphan_references' | 'ai_service';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  count?: number;
  fixable: boolean;
};

/**
 * Runs a set of automated health checks.
 * Results are logged to the console and saved to system_logs.
 */
export const runDiagnose = async () => {
  const startTime = performance.now();
  const issues: DiagnoseIssue[] = [];
  
  try {
    // 0. Pre-flight check: Only run diagnosis if there is an active session to avoid RLS/400 errors for guests
    const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    if (!session?.user) {
      logger.info('[AutoDiagnose] No authenticated session. Skipping background check.');
      return [];
    }

    // 1. Check for Orphan Photos (Invalid URLs or missing URLs)
    const { count: orphanPhotos } = await supabase
      .from('furniture_items')
      .select('*', { count: 'exact', head: true })
      .or('image_url.is.null,image_url.eq."",image_url.not.like.http%');
    
    if (orphanPhotos && orphanPhotos > 0) {
      issues.push({
        type: 'orphan_photos',
        severity: orphanPhotos > 20 ? 'critical' : 'warning',
        message: `发现 ${orphanPhotos} 张孤本照片（无有效 URL）`,
        count: orphanPhotos,
        fixable: true
      });
    }

    // 2. Check for Orphan References (Photos pointing to non-existent groups)
    // Note: We use a lightweight query instead of a complex RPC if RPC doesn't exist
    const { data: orphanRefs } = await supabase
      .from('furniture_items')
      .select('id, group_id')
      .not('group_id', 'is', null);
      
    if (orphanRefs && orphanRefs.length > 0) {
      // In a real scenario, we might want to check if these group_ids actually exist.
      // For now, we'll rely on the DB foreign key constraints if they are ON DELETE SET NULL.
      // But if we want to find "logical" orphans:
      const groupIds = Array.from(new Set(orphanRefs.map(p => p.group_id)));
      const { data: existingGroups } = await supabase
        .from('groups')
        .select('id')
        .in('id', groupIds);
        
      const existingGroupIds = new Set(existingGroups?.map(g => g.id));
      const deadRefs = orphanRefs.filter(p => !existingGroupIds.has(p.group_id));
      
      if (deadRefs.length > 0) {
        issues.push({
          type: 'orphan_references',
          severity: 'critical',
          message: `发现 ${deadRefs.length} 条孤儿引用（指向已删除的分组）`,
          count: deadRefs.length,
          fixable: true
        });
      }
    }

    // 3. AI Service Health Check (Basic connectivity)
    let hasAiKey = false;
    try {
      const response = await api.admin.settings['get-keys'].$get();
      if (response.ok) {
        const res = await response.json();
        if (res?.success) {
          hasAiKey = res.keysStatus?.openrouter;
        }
      }
    } catch (e) {
      logger.warn('[AutoDiagnose] AI health check failed to fetch keys:', e);
    }

    if (!hasAiKey) {
      issues.push({
        type: 'ai_service',
        severity: 'warning',
        message: 'AI 服务未配置或无法连接：缺少有效 API Key',
        fixable: false
      });
    }

    // Log the result to system_logs via logResult (Our primary audit trail)
    const duration = performance.now() - startTime;
    await logResult(
      {
        action: 'auto_diagnose',
        component: 'AutoDiagnose',
        kind: 'UNKNOWN',
        metadata: {
          issues_count: issues.length,
          issues_summary: issues.map(i => ({ type: i.type, severity: i.severity })),
          duration_ms: duration
        }
      },
      issues.some(i => i.severity === 'critical') ? 'error' : 'success',
      { message: `[AutoDiagnose] 完成检测，耗时 ${duration.toFixed(0)}ms. 发现 ${issues.length} 个问题。` }
    );

    logger.info(`[AutoDiagnose] Run completed in ${duration.toFixed(0)}ms. Issues: ${issues.length}`);
    return issues;
  } catch (err: any) {
    logger.error('[AutoDiagnose] Failed to run diagnosis:', err);
    return [];
  }
};

let isInitialized = false;

/**
 * Starts the background diagnosis loop.
 */
export const startAutoDiagnose = () => {
  if (typeof window === 'undefined') return;
  if (isInitialized) return;
  isInitialized = true;
  
  let intervalId: any = null;

  const startPolling = () => {
    if (intervalId) return;
    intervalId = setInterval(() => {
      // Only run diagnosis if tab is active/visible
      if (!document.hidden) {
        runDiagnose();
      }
    }, 6 * 60 * 60 * 1000); // Every 6 hours
  };

  const stopPolling = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  // Initial check after 1 minute (don't block bootstrap)
  setTimeout(() => {
    if (!document.hidden) {
      runDiagnose();
    }
  }, 60 * 1000);
  
  // Listen for page visibility changes
  const handleVisibilityChange = () => {
    if (document.hidden) {
      logger.info('[AutoDiagnose] Tab hidden, pausing diagnose loop');
      stopPolling();
    } else {
      logger.info('[AutoDiagnose] Tab active, resuming/running diagnose');
      runDiagnose();
      startPolling();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  startPolling();
};
