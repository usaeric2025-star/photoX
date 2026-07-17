import { rawApi } from './api-raw.js';
import { logger } from './logger.js';

export type TelemetryError = {
    message: string;
    level: 'error' | 'warn' | 'info';
    operation: string;
    metadata: Record<string, unknown>;
};

export type TelemetryPerformance = {
    name: string;
    duration: number;
    threshold: number;
    metadata?: Record<string, unknown>;
};

export const telemetry = {
    trackError: async (error: TelemetryError) => {
        try {
            await rawApi.api.system['log-error'].$post({ json: error });
        } catch (e) {
            logger.error('Failed to report telemetry error:', e);
        }
    },
    trackPerformance: async (perf: TelemetryPerformance) => {
        try {
            await rawApi.api.system['log-performance'].$post({ json: perf });
        } catch (e) {
            logger.error('Failed to report telemetry performance:', e);
        }
    }
};
