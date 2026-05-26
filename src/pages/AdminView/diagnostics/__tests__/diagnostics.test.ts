import { describe, it, expect, beforeEach } from 'vitest';
import { DiagnosticTest, diagnosticRegistry, registerDiagnostic } from '../index';

import '../emptyData.test';
import '../ebIntegrity.test';
import '../singleItem.test';
import '../longText.test';
import '../missingFields.test';
import '../filterStorm.test';
import '../scrollReset.test';
import '../batchSelect.test';
import '../lanesFallback.test';
import '../lanesResize.test';
import '../lanesEmptyState.test';
import '../selectBoundary.test';
import '../prefetchCache.test';
import '../elementSizeSafety.test';

describe('Admin Diagnostics Interfaces', () => {
  beforeEach(() => {
    // Clear the registry manually for specific tests if needed
    // But since we want to check total length from global imports, 
    // we should be careful. We'll only clear conditionally or use another block.
  });

  it('should have 14 registered diagnostic tests exactly', async () => {
    // Because we imported all 14 modules above, they should all be registered by now.
    expect(diagnosticRegistry.length).toBe(14);
    const ids = diagnosticRegistry.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(14);
  });

  it('should correctly register a new diagnostic test to the registry', async () => {
    const originalLength = diagnosticRegistry.length;
    const dummyTest: DiagnosticTest = {
      id: 'test_1',
      name: 'Dummy Test 1',
      description: 'A simple test stub',
      run: async () => ({ passed: true, message: 'OK', durationMs: 1 })
    };

    registerDiagnostic(dummyTest);
    expect(diagnosticRegistry.length).toBe(originalLength + 1);
    expect(diagnosticRegistry.find(t => t.id === 'test_1')).toBeDefined();
  });

  it('should not register duplicate diagnostic tests', async () => {
    const originalLength = diagnosticRegistry.length;
    const dummyTest: DiagnosticTest = {
      id: 'test_2',
      name: 'Dummy Test 2',
      description: 'A simple test stub',
      run: async () => ({ passed: true, message: 'OK', durationMs: 1 })
    };

    registerDiagnostic(dummyTest);
    registerDiagnostic(dummyTest); // second time
    expect(diagnosticRegistry.length).toBe(originalLength + 1);
  });
});

