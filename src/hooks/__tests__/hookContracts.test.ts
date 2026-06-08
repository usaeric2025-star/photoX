import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { usePhotoSelection } from '@/hooks/photo/usePhotoSelection';

// Mock zustand gallery store for rendering test hooks
vi.mock('@/store/useUIStore', () => ({
  useUIStore: (fn: any) => fn({
    isMultiSelect: false,
    selectedIds: [],
    update: vi.fn()}),
  useShallow: (fn: any) => fn,
}));

describe('Hook Rigid Contracts [HOOK-CONTRACT]', () => {
  
  it('[HOOK-CONTRACT] 依賴數組靜態性檢查', () => {
    // Audit the file contents of core custom hooks to ensure compliance with @deps-contract static annotation
    const hookDirs = [
      path.join(process.cwd(), 'src/hooks'),
    ];

    let totalContractsFound = 0;

    hookDirs.forEach((dir) => {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      files.forEach((file) => {
        if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return;
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) return;

        const content = fs.readFileSync(filepath, 'utf8');
        
        // Scan for @deps-contract pattern
        if (content.includes('@deps-contract:')) {
          totalContractsFound++;
          const lines = content.split('\n');
          lines.forEach((line) => {
            if (line.includes('@deps-contract:')) {
              // Ensure it follows static/dynamic format
              expect(line).toMatch(/@deps-contract:\s*static=\[.*\]\s*dynamic=\[.*\]/);
            }
          });
        }
      });
    });

    expect(totalContractsFound).toBeGreaterThanOrEqual(1);
  });

  it('[HOOK-CONTRACT] 模組 JSDoc @hook-contract 註釋檢查', () => {
    // Read files to ensure JSDoc "@hook-contract" exists
    const filesToAudit = [
      path.join(process.cwd(), 'src/features/photos/usePhotoSelection.ts'),
    ];

    filesToAudit.forEach((filepath) => {
      expect(fs.existsSync(filepath)).toBe(true);
      const content = fs.readFileSync(filepath, 'utf8');
      expect(content).toContain('@hook-contract');
      expect(content).toContain('inputs');
      expect(content).toContain('outputs');
      expect(content).toContain('invariants');
    });
  });

  it('[HOOK-CONTRACT] 返回值結構完整性 (usePhotoSelection)', () => {
    const { result } = renderHook(() => usePhotoSelection());
    const returned = result.current;

    // Must be object, NOT tuple/array
    expect(Array.isArray(returned)).toBe(false);
    expect(typeof returned).toBe('object');
    expect(returned).not.toBeNull();

    // Key properties
    expect(returned).toHaveProperty('isMultiSelect');
    expect(returned).toHaveProperty('selectedIds');
    expect(returned).toHaveProperty('enable');
    expect(returned).toHaveProperty('disable');
    expect(returned).toHaveProperty('toggle');
  });
});
