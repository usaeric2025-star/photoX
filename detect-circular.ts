import * as fs from 'fs';
import * as path from 'path';

// Parse imports from a file content using simple regex
function getImports(filePath: string, content: string): string[] {
  const imports: string[] = [];
  // Match dynamic and static imports
  // e.g., import ... from '...'; or import('...'); or export * from '...'; export { ... } from '...';
  const patterns = [
    /import\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g,
    /export\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      imports.push(match[1]);
    }
  }
  return imports;
}

const srcDir = path.join(process.cwd(), 'src');

// Keep track of resolved file paths to avoid missing index.ts, index.tsx etc.
function resolveImportPath(currentFile: string, importString: string): string | null {
  if (importString.startsWith('.')) {
    const dir = path.dirname(currentFile);
    const resolved = path.resolve(dir, importString);
    return findActualFile(resolved);
  } else if (importString.startsWith('@/')) {
    const relSub = importString.slice(2);
    const resolved = path.resolve(srcDir, relSub);
    return findActualFile(resolved);
  }
  return null; // External package or non-alias
}

const extensions = ['.tsx', '.ts', '.jsx', '.js'];

function findActualFile(basePath: string): string | null {
  // Check if direct file exists
  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
    return basePath;
  }
  // Try extensions
  for (const ext of extensions) {
    const p = basePath + ext;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      return p;
    }
  }
  // Try folder index
  const indexBase = path.join(basePath, 'index');
  for (const ext of extensions) {
    const p = indexBase + ext;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      return p;
    }
  }
  return null;
}

// Build Graph
const graph: Record<string, string[]> = {};

function walkDir(dir: string, callback: (filePath: string) => void) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else if (stat.isFile() && (filePath.endsWith('.ts') || filePath.endsWith('.tsx'))) {
      callback(filePath);
    }
  }
}

const filesList: string[] = [];
walkDir(srcDir, (f) => filesList.push(f));

filesList.forEach((file) => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const rawImports = getImports(file, content);
    const resolvedDeps: string[] = [];
    rawImports.forEach((imp) => {
      const resolved = resolveImportPath(file, imp);
      if (resolved && resolved !== file) {
        resolvedDeps.push(resolved);
      }
    });
    // Remove duplicates
    graph[file] = Array.from(new Set(resolvedDeps));
  } catch (e: any) {
    console.error(`Error reading ${file}:`, e.message);
  }
});

// Detect Cycles using colored DFS (0=unvisited, 1=visiting, 2=visited)
const state: Record<string, number> = {};
const pathCache: string[] = [];
const cycles: string[][] = [];

function dfs(node: string) {
  state[node] = 1; // Visiting
  pathCache.push(node);

  const neighbors = graph[node] || [];
  for (const neighbor of neighbors) {
    if (state[neighbor] === 1) {
      // Cycle detected!
      const cycleStartIdx = pathCache.indexOf(neighbor);
      const cycle = pathCache.slice(cycleStartIdx);
      cycle.push(neighbor);
      cycles.push(cycle);
    } else if (!state[neighbor]) {
      dfs(neighbor);
    }
  }

  pathCache.pop();
  state[node] = 2; // Visited
}

Object.keys(graph).forEach((node) => {
  if (!state[node]) {
    dfs(node);
  }
});

// Format path to be relative to src/
function toRelative(fullPath: string): string {
  return path.relative(process.cwd(), fullPath);
}

console.log('--- DETECTION RESULTS ---');
if (cycles.length === 0) {
  console.log('✅ No circular dependencies detected in src/!');
} else {
  console.log(`❌ Found ${cycles.length} circular dependencies:`);
  // De-duplicate cycles by canonicalizing (rotating to start at min element)
  const uniqueCyclesMap = new Map<string, string[]>();
  cycles.forEach((cycle) => {
    const relCycle = cycle.map(toRelative);
    // Remove trailing duplicate to help sorting
    const uniqueNodes = relCycle.slice(0, -1);
    
    // Rotate so the lexicographically first node is starting
    let minIdx = 0;
    for (let i = 1; i < uniqueNodes.length; i++) {
      if (uniqueNodes[i] < uniqueNodes[minIdx]) {
        minIdx = i;
      }
    }
    const rotated = [...uniqueNodes.slice(minIdx), ...uniqueNodes.slice(0, minIdx)];
    const key = rotated.join(' -> ');
    uniqueCyclesMap.set(key, [...rotated, rotated[0]]);
  });

  Array.from(uniqueCyclesMap.keys()).sort().forEach((key, index) => {
    console.log(`\nCycle #${index + 1}:`);
    console.log(`  ${key}`);
  });
}
