import { perfAudit, PerfIncident } from '@/lib/perfAudit';

interface PerformanceIssue {
  id: string;
  severity: 'P0' | 'P1' | 'P2';
  title: string;
  description: string;
  affectedCount: number;
}

export function usePerformanceAudit() {
  const incidents = perfAudit.getIncidents();

  const issues: any[] = [];
  
  // Group incidents by label
  const grouped = incidents.reduce((acc, curr) => {
    if (!acc[curr.label]) acc[curr.label] = [];
    acc[curr.label].push(curr);
    return acc;
  }, {} as Record<string, PerfIncident[]>);

  Object.entries(grouped).forEach(([label, list]) => {
    if (list.length > 5) {
      const avgDuration = list.reduce((a, b) => a + b.duration, 0) / list.length;
      const maxDuration = Math.max(...list.map(i => i.duration));
      
      issues.push({
        id: `perf_${label}`,
        category: 'performance',
        severity: 'P2',
        title: `${label} 性能分析预警`,
        description: `检测到 ${label} 在近期运行中多次触发阈值。平均耗时 ${avgDuration.toFixed(2)}ms，最大耗时 ${maxDuration.toFixed(2)}ms。当前处于 L2 观察期，若平均耗时持续超过阈值将触发 L3 优化。`,
        affectedCount: list.length,
        autoFixable: true,
        actionName: '清除统计/忽略',
        isClientOnly: true
      });
    }
  });

  return { performanceIssues: issues, clearAudits: perfAudit.clear };
}
