import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '../src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(srcDir);

for (const file of files) {
  // Skip store definition files to avoid circular imports or messing up the adapter itself
  if (file.includes('src/lib/store') || file.includes('src/store') || file.includes('src/lib/task-queue/store') || file.includes('src/lib/task-queue/scheduler')) {
    continue;
  }

  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // --- React Query Replacements ---
  if (content.includes("@tanstack/react-query") || content.includes("'@tanstack/react-query'")) {
    // We already did a preliminary pass, but let's do a robust replacement of any remaining direct import of query/mutation/client
    // Case 1: useQuery, useMutation, useQueryClient
    const r1 = /import\s+{\s*useQuery\s*,\s*useMutation\s*,\s*useQueryClient\s*}\s+from\s+['"]@tanstack\/react-query['"]/g;
    if (r1.test(content)) {
      content = content.replace(r1, `import { useAppQuery as useQuery, useAppMutation as useMutation, useAppQueryClient as useQueryClient } from '@/lib/query'`);
      changed = true;
    }

    // Case 2: useQuery, useQueryClient
    const r2 = /import\s+{\s*useQuery\s*,\s*useQueryClient\s*}\s+from\s+['"]@tanstack\/react-query['"]/g;
    if (r2.test(content)) {
      content = content.replace(r2, `import { useAppQuery as useQuery, useAppQueryClient as useQueryClient } from '@/lib/query'`);
      changed = true;
    }

    // Case 3: useMutation, useQueryClient
    const r3 = /import\s+{\s*useMutation\s*,\s*useQueryClient\s*}\s+from\s+['"]@tanstack\/react-query['"]/g;
    if (r3.test(content)) {
      content = content.replace(r3, `import { useAppMutation as useMutation, useAppQueryClient as useQueryClient } from '@/lib/query'`);
      changed = true;
    }

    // Case 4: useQueryClient
    const r4 = /import\s+{\s*useQueryClient\s*}\s+from\s+['"]@tanstack\/react-query['"]/g;
    if (r4.test(content)) {
      content = content.replace(r4, `import { useAppQueryClient as useQueryClient } from '@/lib/query'`);
      changed = true;
    }

    // Case 5: useQuery
    const r5 = /import\s+{\s*useQuery\s*}\s+from\s+['"]@tanstack\/react-query['"]/g;
    if (r5.test(content)) {
      content = content.replace(r5, `import { useAppQuery as useQuery } from '@/lib/query'`);
      changed = true;
    }

    // Case 6: useMutation
    const r6 = /import\s+{\s*useMutation\s*}\s+from\s+['"]@tanstack\/react-query['"]/g;
    if (r6.test(content)) {
      content = content.replace(r6, `import { useAppMutation as useMutation } from '@/lib/query'`);
      changed = true;
    }
  }

  // --- Zustand Store Adaper Replacements ---

  // 1. useUIStore -> useUI
  const importUIStore = /import\s+{[^}]*\buseUIStore\b[^}]*}\s+from\s+['"]@\/store(\/useUIStore)?['"]/g;
  if (importUIStore.test(content)) {
    // Determine if useShallow is also imported alongside useUIStore
    const hasShallow = content.includes('useShallow');
    let replacement = `import { useUI${hasShallow ? ', useStoreShallow' : ''} } from '@/lib/store'`;
    content = content.replace(importUIStore, replacement);
    if (hasShallow) {
      // Remove any remaining useShallow imports from 'zustand/react/shallow' or client libraries
      content = content.replace(/import\s+{[^}]*\buseShallow\b[^}]*}\s+from\s+['"]zustand\/react\/shallow['"]/g, '');
      content = content.replace(/import\s+{[^}]*\buseShallow\b[^}]*}\s+from\s+['"]@\/store\/useUIStore['"]/g, '');
      content = content.replace(/\buseShallow\b/g, 'useStoreShallow');
    }
    changed = true;
  }

  // Double check other variations of import from @/store
  if (content.includes("import { useUIStore } from '@/store';") || content.includes('import { useUIStore } from "@/store";')) {
    content = content.replace(/import\s+{\s*useUIStore\s*}\s+from\s+['"]@\/store['"]/g, "import { useUI } from '@/lib/store'");
    changed = true;
  }

  // 2. useAuthStore -> useAuth
  const importAuthStore = /import\s+{[^}]*\buseAuthStore\b[^}]*}\s+from\s+['"]@\/store\/useAuthStore['"]/g;
  if (importAuthStore.test(content)) {
    content = content.replace(importAuthStore, "import { useAuth } from '@/lib/store'");
    changed = true;
  }
  // Double check import { useAuthStore, initAuthListener } from '@/store/useAuthStore';
  if (content.includes("from '@/store/useAuthStore'")) {
    content = content.replace(/import\s+{\s*useAuthStore\s*,\s*initAuthListener\s*}\s+from\s+['"]@\/store\/useAuthStore['"]/g, "import { useAuth } from '@/lib/store';\nimport { initAuthListener } from '@/store/useAuthStore'");
    changed = true;
  }

  // 3. useTaskStore -> useTask
  const importTaskStore = /import\s+{[^}]*\buseTaskStore\b[^}]*}\s+from\s+['"]@\/lib\/task-queue\/store['"]/g;
  if (importTaskStore.test(content)) {
    content = content.replace(importTaskStore, "import { useTask } from '@/lib/store'");
    changed = true;
  }

  // Also replace usage words
  // Map useUIStore.getState() -> storeAccessor.ui
  if (content.includes("useUIStore.getState()")) {
    content = content.replace(/useUIStore\.getState\(\)/g, "storeAccessor.ui");
    if (!content.includes("import {") || !content.includes("storeAccessor")) {
      content = content.replace(/import\s+{[^}]*}\s+from\s+['"]@\/lib\/store['"]/g, (match) => {
        return match.replace(/import\s+{(.*)}/, "import { $1, storeAccessor }");
      });
    }
    changed = true;
  }
  
  // Map useAuthStore.getState() -> storeAccessor.auth
  if (content.includes("useAuthStore.getState()")) {
    content = content.replace(/useAuthStore\.getState\(\)/g, "storeAccessor.auth");
    if (!content.includes("import {") || !content.includes("storeAccessor")) {
      content = content.replace(/import\s+{[^}]*}\s+from\s+['"]@\/lib\/store['"]/g, (match) => {
        return match.replace(/import\s+{(.*)}/, "import { $1, storeAccessor }");
      });
    }
    changed = true;
  }

  // Map useTaskStore.getState() -> storeAccessor.task
  if (content.includes("useTaskStore.getState()")) {
    content = content.replace(/useTaskStore\.getState\(\)/g, "storeAccessor.task");
    if (!content.includes("import {") || !content.includes("storeAccessor")) {
      content = content.replace(/import\s+{[^}]*}\s+from\s+['"]@\/lib\/store['"]/g, (match) => {
        return match.replace(/import\s+{(.*)}/, "import { $1, storeAccessor }");
      });
    }
    changed = true;
  }

  // Replace component method invocations
  if (content.includes("useUIStore")) {
    content = content.replace(/\buseUIStore\b/g, "useUI");
    changed = true;
  }
  if (content.includes("useAuthStore")) {
    content = content.replace(/\buseAuthStore\b/g, "useAuth");
    changed = true;
  }
  if (content.includes("useTaskStore")) {
    content = content.replace(/\buseTaskStore\b/g, "useTask");
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
  }
}

console.log('Done refactoring business components to use Store and Query adapters');
