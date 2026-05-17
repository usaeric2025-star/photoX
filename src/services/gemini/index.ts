import { analyzeProductPhoto } from './photoAnalysisCore';

export * from './photoAnalysisCore';
export * from './translationCore';
export * from './dimensionNormalizer';
export * from './imageProcessor';

export const testAiConnection = async (apiKey: string, provider: string, customModel?: string) => {
  try {
    await analyzeProductPhoto(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNiAAAAAgAB35oT2AAAAABJRU5ErkJggg==',
      [],
      [],
      [],
      apiKey,
      provider,
      customModel
    );
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
};
