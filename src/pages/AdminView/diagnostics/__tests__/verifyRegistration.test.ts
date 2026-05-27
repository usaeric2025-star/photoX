import { expect, it, describe } from 'vitest';
import { diagnosticRegistry } from '../index';

// Import all diagnostic files to register them
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

describe('Admin Diagnostics Registration', () => {
  it('should have all 32+ diagnostics registered', () => {
    expect(diagnosticRegistry.length).toBeGreaterThanOrEqual(32);
  });
});
