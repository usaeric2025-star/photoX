
export type TelemetryError = {
    message: string;
    level: 'error' | 'warn' | 'info';
    operation: string;
    metadata: Record<string, unknown>;
};

export type TelemetryPerformance = {
    name: string;
    duration: number;
    metadata: Record<string, unknown>;
};

export const telemetry = {
    trackError: async (error: TelemetryError) => {
        try {
            await fetch('/api/system/log-error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(error)
            });
        } catch (e) {
            console.error('Failed to report telemetry error:', e);
        }
    },
    trackPerformance: async (perf: TelemetryPerformance) => {
        try {
            await fetch('/api/system/log-performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(perf)
            });
        } catch (e) {
            console.error('Failed to report telemetry performance:', e);
        }
    }
};
