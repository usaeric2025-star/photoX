const fs = require('fs');
let code = fs.readFileSync('src/features/ai/orchestration.ts', 'utf8');

const regex = /  \/\/ Simple concurrency pool\s+const processPhoto = async \(photo: Photo, index: number\) => \{\s+if \(signal\?\.aborted\) return;\s+await analyzeAndSavePhoto\(photo, allTags, categories, signal\);\s+try \{\s+await analyzeAndSavePhoto\(photo\);\s+\} catch \(err\) \{\s+ErrorFactory\.handle\(err, \{ context: `\[AI Batch\] Photo \$\{photo.id\} error` \}\);\s+\} finally \{\s+finishedCount\+\+;\s+const progress = Math\.min\(0\.85, \(finishedCount \/ totalPhotosToProcess\) \* 0\.85\);\s+onProgress\(progress, `已完成 \$\{finishedCount\}\/\$\{totalPhotosToProcess\} 張照片分析`\);\s+\}\s+\};/g;

const replacement = `  // Simple concurrency pool
  const processPhoto = async (photo: Photo, index: number) => {
    if (signal?.aborted) return;
        
    try {
      await analyzeAndSavePhoto(photo, allTags, categories, signal);
    } catch (err) {
      ErrorFactory.handle(err, { context: \`[AI Batch] Photo \${photo.id} error\` });
    } finally {
      finishedCount++;
      const progress = Math.min(0.85, (finishedCount / totalPhotosToProcess) * 0.85);
      onProgress(progress, \`已完成 \${finishedCount}/\${totalPhotosToProcess} 張照片分析\`);
    }
  };`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/features/ai/orchestration.ts', code, 'utf8');
