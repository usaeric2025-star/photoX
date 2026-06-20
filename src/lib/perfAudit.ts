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
 * Uses browser native localStorage to remain decoupled.
 */
export const perfAudit = {
  record: (incident: Omit<PerfIncident, 'timestamp'>) => {
    try {
      if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return;
      const stored = window.localStorage.getItem(STORAGE_KEY);
      let incidents: PerfIncident[] = stored ? JSON.parse(stored) : [];
      
      incidents.unshift({ ...incident, timestamp: Date.now() });
      
      // Limit to MAX_INCIDENTS
      if (incidents.length > MAX_INCIDENTS) {
        incidents = incidents.slice(0, MAX_INCIDENTS);
      }
      
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(incidents));
    } catch (e) {
      console.warn('[PerfAudit] Failed to record incident:', e);
    }
  },

  getIncidents: (): PerfIncident[] => {
    try {
      if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return [];
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  clear: () => {
    try {
      if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return;
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // ignore
    }
  }
};
