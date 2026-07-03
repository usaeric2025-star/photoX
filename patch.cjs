const fs = require('fs');
let code = fs.readFileSync('api/_lib/db/queries/photos.ts', 'utf8');

const target = `    // 1. Smarter Count with Cache
    const cacheKey = JSON.stringify({ categoryId, tagId, searchQuery, isAdminMode, onlyUngrouped, onlyGroupsCover, groupId, isHidden });
    const cached = countCache.get(cacheKey);

    let totalPromise: Promise<number>;
    if (cached && Date.now() - cached.timestamp < 60000) {
        totalPromise = Promise.resolve(cached.count);
    } else {
        totalPromise = db.select({ count: count() })
            .from(furnitureItems)
            .where(finalWhere)
            .execute()
            .then(res => {
                const cnt = Number(res[0]?.count || 0);
                countCache.set(cacheKey, { count: cnt, timestamp: Date.now() });
                return cnt;
            })
            .catch(e => {
                logger.warn('Count query failed or timed out, using fallback total=0', e);
                return cached?.count || 0;
            });
    }`;

const replacement = `    // 1. Smarter Count with Cache
    const cacheKey = JSON.stringify({ categoryId, tagId, searchQuery, isAdminMode, onlyUngrouped, onlyGroupsCover, groupId, isHidden });
    const cached = countCache.get(cacheKey);

    let totalPromise: Promise<number>;
    if (cursor) {
        totalPromise = Promise.resolve(cached?.count || 0);
    } else if (cached && Date.now() - cached.timestamp < 60000) {
        totalPromise = Promise.resolve(cached.count);
    } else {
        const timeoutPromise = new Promise<number>((resolve) => 
            setTimeout(() => {
                logger.warn('Count query timed out after 3s, using fallback');
                resolve(cached?.count || 0);
            }, 3000)
        );
        
        const countQueryPromise = db.select({ count: count() })
            .from(furnitureItems)
            .where(finalWhere)
            .execute()
            .then(res => {
                const cnt = Number(res[0]?.count || 0);
                countCache.set(cacheKey, { count: cnt, timestamp: Date.now() });
                return cnt;
            })
            .catch(e => {
                logger.warn('Count query failed, using fallback total=0', e);
                return cached?.count || 0;
            });
            
        totalPromise = Promise.race([countQueryPromise, timeoutPromise]);
    }`;

code = code.replace(target, replacement);
fs.writeFileSync('api/_lib/db/queries/photos.ts', code);
