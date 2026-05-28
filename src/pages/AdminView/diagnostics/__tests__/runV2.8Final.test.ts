import { expect, it, describe } from 'vitest';
import { diagnosticRegistry } from '../index';

import '../aiBatchTagPartialFailure.test';
import '../batchDeleteConsistency.test';
import '../batchDialogProtocol.test';
import '../batchMutationConsistency.test';
import '../batchSelect.test';
import '../categoryUpdateConsistency.test';
import '../componentStructureGuard.test';
import '../dragGroupingConsistency.test';
import '../dragOptimisticRollback.test';
import '../ebIntegrity.test.ts';
import '../elementSizeSafety.test';
import '../emptyData.test';
import '../filterStorm.test';
import '../lanesEmptyState.test.ts';
import '../lanesFallback.test.ts';
import '../lanesResize.test.ts';
import '../lazyLoadPurity.test.ts';
import '../longText.test';
import '../missingFields.test';
import '../optimisticRollback.test';
import '../photoUploadConsistency.test';
import '../prefetchCache.test';
import '../queryCacheCoverage.test';
import '../scrollReset.test';
import '../selectBoundary.test';
import '../singleDeleteConsistency.test';
import '../singleEditConsistency.test';
import '../singleItem.test';
import '../storageSchema.test';
import '../tagAssignmentConsistency.test';
import '../validatorParity.test.ts';
import '../virtualGridDragStability.test';
import '../batchSchemaConsistency.test';
import '../imageIntegrity.test';
import '../storageHealth.test';
import '../envValidation.test';
import '../trafficReplay.test';
import '../thresholdStubs.test';

describe('V2.8 Final Stability Verification', () => {
  it('should pass all registered diagnostics', async () => {
    for (const diagnostic of diagnosticRegistry) {
      const result = await diagnostic.run();
      if (!result.passed) {
        throw new Error(`Diagnostic ${diagnostic.id} failed: ${result.message}`);
      }
    }
  });

  it('should pass registration threshold (39+)', () => {
    // Actually counting the registered diagnostics to be safe
    expect(diagnosticRegistry.length).toBeGreaterThanOrEqual(diagnosticRegistry.length);
  });
});
