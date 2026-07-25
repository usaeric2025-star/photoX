const fs = require('fs');
let code = fs.readFileSync('src/features/ai/orchestration.ts', 'utf8');

code = code.replace(
`  onProgress(0.05, \`正在準備分析 \${totalPhotosToProcess} 張照片...\`);

  // Simple concurrency pool
  const processPhoto = async (photo: Photo, index: number) => {
    if (signal?.aborted) return;
        
    try {
      await analyzeAndSavePhoto(photo);`,
`  onProgress(0.05, \`正在準備分析 \${totalPhotosToProcess} 張照片...\`);

  let allTags: Tag[] = [];
  let categories: Category[] = [];
  try {
    const [tagsRes, catsRes] = await Promise.all([
      api.tags.$get(),
      api.categories.$get()
    ]);
    // Use proper destructuring or typing if possible, here we just try to get the data
    const tagsData = await ErrorFactory.unwrap<Tag[]>(tagsRes, 'Tags fail', { silent: true });
    const catsData = await ErrorFactory.unwrap<Category[]>(catsRes, 'Cats fail', { silent: true });
    if (tagsData) allTags = tagsData;
    if (catsData) categories = catsData;
  } catch (err) {
    ErrorFactory.handle(err, { context: '[AI Batch] Failed to prefetch reference data', silent: true });
  }

  // Simple concurrency pool
  const processPhoto = async (photo: Photo, index: number) => {
    if (signal?.aborted) return;
        
    try {
      await analyzeAndSavePhoto(photo, allTags, categories, signal);`
);

fs.writeFileSync('src/features/ai/orchestration.ts', code, 'utf8');
