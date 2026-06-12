

export interface PerfIncident {
  label: string;
  duration: number;
  threshold: number;
  timestamp: number;
}

const STORAGE_KEY = 'photox_perf_incidents';
const MAX_INCIDENTS = 50;

/**
 * PerfAudit
 * Collects performance incidents for diagnostics.
 */
export const perfAudit = {
  record: (incident: Omit<PerfIncident, 'timestamp'>) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let incidents: PerfIncident[] = stored ? JSON.parse(stored) : [];
      
      incidents.unshift({ ...incident, timestamp: Date.now() });
      
      // Limit to MAX_INCIDENTS
      if (incidents.length > MAX_INCIDENTS) {
        incidents = incidents.slice(0, MAX_INCIDENTS);
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(incidents));
    } catch (e) {
      console.warn('[PerfAudit] Failed to record incident:', e);
    }
  },

  getIncidents: (): PerfIncident[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  clear: () => {
    localStorage.removeItem(STORAGE_KEY);
  }
};
