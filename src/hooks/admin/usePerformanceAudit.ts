import { perfAudit, PerfIncident } from '#lib/perfAudit.js';
import { useTranslation } from '#src/hooks/index.js';

interface PerformanceIssue {
  id: string;
  category: string;
  severity: 'P0' | 'P1' | 'P2';
  title: string;
  description: string;
  affectedCount: number;
  autoFixable: boolean;
  actionName: string;
  isClientOnly: boolean;
}

export function usePerformanceAudit() {
  const { t } = useTranslation();
  const incidents = perfAudit.getIncidents();

  const issues: PerformanceIssue[] = [];
  
  // Group incidents by label
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

  return { performanceIssues: issues, clearAudits: perfAudit.clear };
}
