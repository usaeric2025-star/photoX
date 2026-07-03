const fs = require('fs');

function replaceInFile(file, replacer) {
    let code = fs.readFileSync(file, 'utf8');
    code = replacer(code);
    fs.writeFileSync(file, code);
}

// 1. api/_handlers/photos/create.ts
replaceInFile('api/_handlers/photos/create.ts', code => {
    return code.replace(/nameStr = obj\.zh \|\| obj\.en \|\| obj\.ms \|\| '';/g, 'nameStr = String(obj.zh || obj.en || obj.ms || "");');
});

// 2. api/_handlers/photos/update.ts
replaceInFile('api/_handlers/photos/update.ts', code => {
    return code.replace(/nameStr = obj\.zh \|\| obj\.en \|\| obj\.ms \|\| '';/g, 'nameStr = String(obj.zh || obj.en || obj.ms || "");');
});

// 3. api/_lib/groups.ts
replaceInFile('api/_lib/groups.ts', code => {
    return code.replace(/const dbGroup = groupMap\.get\(groupId\) as \{ id: string; name: unknown; status: string; coverPhotoId: string \| null \};/g, 'const dbGroup = groupMap.get(groupId) as { id: string; name: unknown; status: string; coverPhotoId: string | null; createdAt: Date };');
});

