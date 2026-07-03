const fs = require('fs');

function replaceInFile(file, replacer) {
    let code = fs.readFileSync(file, 'utf8');
    code = replacer(code);
    fs.writeFileSync(file, code);
}

// 1. api/_handlers/photos/update.ts
replaceInFile('api/_handlers/photos/update.ts', code => {
    return code.replace(/const obj = updates\.name as any;/g, 'const obj = updates.name as Record<string, unknown>;');
});

// 2. api/_handlers/photos/create.ts
replaceInFile('api/_handlers/photos/create.ts', code => {
    return code.replace(/const obj = payload\.name as any;/g, 'const obj = payload.name as Record<string, unknown>;')
               .replace(/errorMessage = \(error as any\)\.detail;/g, 'errorMessage = (error as { detail?: string }).detail;');
});

// 3. api/_handlers/admin/photos.ts
replaceInFile('api/_handlers/admin/photos.ts', code => {
    return code.replace(/if \(!rawResult && \(auditLog as any\)\.metadata\) \{/g, 'if (!rawResult && (auditLog as { metadata?: unknown }).metadata) {')
               .replace(/const meta = \(auditLog as any\)\.metadata as Record<string, unknown>;/g, 'const meta = (auditLog as { metadata?: unknown }).metadata as Record<string, unknown>;');
});

// 4. api/_lib/groups.ts
replaceInFile('api/_lib/groups.ts', code => {
    return code.replace(/const dbGroup = groupMap\.get\(groupId\) as any;/g, 'const dbGroup = groupMap.get(groupId) as { id: string; name: unknown; status: string; coverPhotoId: string | null };');
});

// 5. src/services/mappers/photo.ts
replaceInFile('src/services/mappers/photo.ts', code => {
    return code.replace(/const obj = valueToSave as any;/g, 'const obj = valueToSave as Record<string, unknown>;');
});

