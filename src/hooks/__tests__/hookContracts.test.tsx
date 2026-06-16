import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SelectionProvider } from '@/features/selection';
import { TaskProvider } from '@/hooks/core/useTasks';
import { usePhotoSelection } from '@/hooks/photo/usePhotoSelection';

// Mock zustand gallery store for rendering test hooks
vi.mock('@/store/useUIStore', () => ({
  useUIStore: Object.assign(
    (fn: any) => fn({
      isMultiSelect: false,
      selectedIds: [],
      update: vi.fn(),
      resetForm: vi.fn(),
      updateForm: vi.fn(),
    }),
    {
      getState: () => ({ isMultiSelect: false, selectedIds: [] }),
      subscribe: vi.fn(),
    }
  ),
  useShallow: (fn: any) => fn,
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <TaskProvider>
      <SelectionProvider>
        {children}
      </SelectionProvider>
    </TaskProvider>
  </QueryClientProvider>
);

// Mock hooks that cause circular dependency or context issues
vi.mock('@/hooks', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useInvalidatePhotos: () => vi.fn(),
    useRouterSafe: () => ({
      navigate: vi.fn(),
      params: {},
      location: { pathname: '/' }
    })
  };
});

// Mock router hooks directly to prevent context errors
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/' }),
  useNavigate: () => vi.fn(),
  useMatch: () => ({}),
  useRouter: () => ({}),
}));

describe('Hook Rigid Contracts [HOOK-CONTRACT]', () => {
  
  it('[HOOK-CONTRACT] 依賴數組靜態性檢查', () => {
    // Audit the file contents of core custom hooks to ensure compliance with @deps-contract static annotation
    const hookDirs = [
      path.join(process.cwd(), 'src/hooks'),
      path.join(process.cwd(), 'src/hooks/photo'),
      path.join(process.cwd(), 'src/hooks/groups'),
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
      path.join(process.cwd(), 'src/hooks/photo/usePhotoSelection.ts'),
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
    const { result } = renderHook(() => usePhotoSelection(), { wrapper });
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
