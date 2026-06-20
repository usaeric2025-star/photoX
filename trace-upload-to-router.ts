import * as fs from 'fs';
import * as path from 'path';

const resolvedCache: Record<string, string[]> = {};
const aliases: Record<string, string> = {
  '@/': path.join(process.cwd(), 'src') + '/',
};

function resolvePath(importee: string, importer: string): string | null {
  let absolute = '';
  for (const [alias, realPath] of Object.entries(aliases)) {
    if (importee.startsWith(alias)) {
      absolute = importee.replace(alias, realPath);
      break;
    }
  }

  if (!absolute) {
    if (importee.startsWith('.')) {
      absolute = path.resolve(path.dirname(importer), importee);
    } else {
      return null; // External package
    }
  }

  const extensions = ['.ts', '.tsx', '/index.ts', '/index.tsx'];
  for (const ext of extensions) {
    const p = absolute + ext;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      return p;
    }
  }
  if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) {
    return absolute;
  }
  return null;
}

function getImports(filePath: string): string[] {
  if (resolvedCache[filePath]) return resolvedCache[filePath];
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf8');
  const imports: string[] = [];
  const regex = /import\s+type\s+.*from\s+['"](.*)['"]|import\s+.*from\s+['"](.*)['"]|import\s+['"](.*)['"]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const rawPath = match[1] || match[2] || match[3];
    if (rawPath) {
      const resolved = resolvePath(rawPath, filePath);
      if (resolved) {
        imports.push(resolved);
      }
    }
  }
  resolvedCache[filePath] = imports;
  return imports;
}

function findPath(curr: string, target: string, visited: Set<string>, pathList: string[]): string[] | null {
  if (curr === target) return [...pathList, curr];
  if (visited.has(curr)) return null;
  visited.add(curr);

  const imports = getImports(curr);
  for (const imp of imports) {
    const res = findPath(imp, target, visited, [...pathList, curr]);
    if (res) return res;
  }
  visited.delete(curr);
  return null;
}

const startFile = path.resolve('src/features/upload/hooks/usePhotoUpload.ts');
const targetFile = path.resolve('src/router/index.tsx');

const trace = findPath(startFile, targetFile, new Set(), []);
if (trace) {
  console.log('TRACE PATH:');
  trace.forEach((p, idx) => console.log(`${idx}: ${path.relative(process.cwd(), p)}`));
} else {
  console.log('NO TRACE PATH FOUND');
}
