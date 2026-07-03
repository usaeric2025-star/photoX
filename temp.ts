
    // 1. Smarter Count with Cache
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
