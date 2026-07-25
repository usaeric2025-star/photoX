const fs = require('fs');
let code = fs.readFileSync('src/features/ai/orchestration.ts', 'utf8');

code = code.replace(
  "const analyzeAndSavePhoto = async (\n  photo: Photo\n): Promise<unknown> => {",
  "const analyzeAndSavePhoto = async (\n  photo: Photo,\n  allTags: Tag[] = [],\n  categories: Category[] = [],\n  signal?: AbortSignal\n): Promise<unknown> => {"
);

code = code.replace(
  "const analysisData = (await analyzePhoto(photo.id, photo.thumbnailUrl as string)) as PhotoAnalysisResponse;",
  "const analysisData = (await analyzePhoto(photo.id, photo.thumbnailUrl as string, signal)) as PhotoAnalysisResponse;"
);

code = code.replace(
  "const updates = await mapAnalysisToUpdates(analysisData);",
  "const updates = await mapAnalysisToUpdates(analysisData, allTags, categories);"
);

const beforeBlock = `  onProgress(0.05, \`正在準備分析 \${totalPhotosToProcess} 張照片...\`);

  // Simple concurrency pool
  const processPhoto = async (photo: Photo, index: number) => {
    if (signal?.aborted) return;
        
    try {
      await analyzeAndSavePhoto(photo);`;

const afterBlock = `  onProgress(0.05, \`正在準備分析 \${totalPhotosToProcess} 張照片...\`);

  let allTags: Tag[] = [];
  let categories: Category[] = [];
  try {
    const [tagsRes, catsRes] = await Promise.all([
      api.tags.$get(),
      api.categories.$get()
    ]);
    if (tagsRes.ok) allTags = await tagsRes.json() as Tag[];
    if (catsRes.ok) categories = await catsRes.json() as Category[];
  } catch (err) {
    ErrorFactory.handle(err, { context: '[AI Batch] Failed to prefetch reference data', silent: true });
  }

  // Simple concurrency pool
  const processPhoto = async (photo: Photo, index: number) => {
    if (signal?.aborted) return;
        
    try {
      await analyzeAndSavePhoto(photo, allTags, categories, signal);`;

code = code.replace(beforeBlock, afterBlock);

fs.writeFileSync('src/features/ai/orchestration.ts', code, 'utf8');
