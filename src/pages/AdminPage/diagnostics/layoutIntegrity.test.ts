import { test, expect } from 'vitest';

const registerDiagnostic = (_arg: any) => {};
// @ts-ignore
import GroupHeaderRaw from '@/components/groups/GroupHeader.tsx?raw';
// @ts-ignore
import GroupDetailPageRaw from '@/components/GroupDetailPage.tsx?raw';
// @ts-ignore
import GroupDetailSkeletonRaw from '@/components/groups/GroupDetailSkeleton.tsx?raw';

const run = async () => {
    const start = Date.now();
    try {
        const headerPattern = /className="[^"]*sticky top-0[^"]*"/;
        
        const headerMatch = (GroupHeaderRaw as string).match(headerPattern);
        if (headerMatch && !headerMatch[0].includes('flex-shrink-0')) {
            return { passed: false, message: `Missing flex-shrink-0 on GroupHeader`, durationMs: Date.now() - start };
        }

        const viewMatch = (GroupDetailPageRaw as string).match(headerPattern);
        if (viewMatch && !viewMatch[0].includes('flex-shrink-0')) {
             return { passed: false, message: `Missing flex-shrink-0 on GroupDetailPage header`, durationMs: Date.now() - start };
        }

        if (!(GroupDetailSkeletonRaw as string).includes('sticky top-0')) {
            return { passed: false, message: `Skeleton DOM mismatch: missing sticky top-0`, durationMs: Date.now() - start };
        }
        if (!(GroupDetailSkeletonRaw as string).includes('flex-shrink-0')) {
            return { passed: false, message: `Skeleton DOM mismatch: missing flex-shrink-0`, durationMs: Date.now() - start };
        }
        if (!(GroupDetailSkeletonRaw as string).includes('<>')) {
            return { passed: false, message: `Skeleton DOM mismatch: not using fragments`, durationMs: Date.now() - start };
        }

        return {
            passed: true,
            message: `Layout integrity and Skeleton DOM compliance verified.`,
            durationMs: Date.now() - start,
        };
    } catch (e: any) {
        return {
            passed: false,
            message: `Probe error: ${e.message}`,
            durationMs: Date.now() - start,
        };
    }
};

registerDiagnostic({
    id: 'layout-integrity-probe',
    name: 'Layout Integrity & Skeleton DOM',
    description: 'Verifies visual hierarchy contract (flex-shrink-0) and skeleton structural consistency.',
    run
});

test('Layout Integrity', async () => {
    const res = await run();
    expect(res.passed).toBe(true);
});
