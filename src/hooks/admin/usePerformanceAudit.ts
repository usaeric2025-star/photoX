import { useMemo } from 'react';
import { perfAudit, PerfIncident } from '#lib/perfAudit.js';
import { useTranslation } from '#src/hooks/core/index.js';

/**
 * usePerformanceAudit
 * 
 * 獲取並格式化前端性能審計結果。
 */
export function usePerformanceAudit() {
  const { t } = useTranslation();

  const performanceIssues = useMemo(() => {
    const incidents = perfAudit.getIncidents();
    const issues: any[] = [];
    const grouped = incidents.reduce((acc, curr) => {
      if (!acc[curr.label]) acc[curr.label] = [];
      acc[curr.label].push(curr);
      return acc;
    }, {} as Record<string, PerfIncident[]>);

    Object.entries(grouped).forEach(([label, list]: [string, PerfIncident[]]) => {
      if (list.length > 5) {
        const avgDuration = list.reduce((a: number, b: PerfIncident) => a + b.duration, 0) / list.length;
        const maxDuration = Math.max(...list.map((i: PerfIncident) => i.duration));
        issues.push({
          id: `perf_${label}`,
          category: 'performance',
          severity: 'P2',
          title: t('perfAuditTitle', label),
          description: t('perfAuditDesc', label, avgDuration.toFixed(2), maxDuration.toFixed(2)),
          affectedCount: list.length,
          autoFixable: true,
          actionName: t('clearAudit'),
          isClientOnly: true
        });
      }
    });
    return issues;
  }, [t]);

  return {
    performanceIssues,
    clearAudits: perfAudit.clear
  };
}
