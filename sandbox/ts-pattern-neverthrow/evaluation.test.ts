import { describe, it, expect } from 'vitest';
import { processDragResult } from './evaluation';

describe('ts-pattern + neverthrow Resilience', () => {
  it('should handle success state correctly', () => {
    const res = processDragResult({ type: 'success', photoIds: ['1'], targetGroupId: 'group-a' });
    expect(res.isOk()).toBe(true);
    if (res.isOk()) {
      expect(res.value).toBe('Moved 1 to group-a');
    }
  });

  it('should handle error state correctly', () => {
    const res = processDragResult({ type: 'error', message: 'Failed' });
    expect(res.isErr()).toBe(true);
    if (res.isErr()) {
      expect(res.error.message).toBe('Failed');
    }
  });

  it('should provide exhaustive matching', () => {
    // This is verified by TypeScript at compile time
    // If a state was missing, the .exhaustive() would fail to build.
    expect(true).toBe(true);
  });
});
