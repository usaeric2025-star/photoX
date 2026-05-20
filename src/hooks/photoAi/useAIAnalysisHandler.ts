import { User, Photo, Category, Tag, Manufacturer } from '@/types';
import { analyzeProductPhoto, translateDescription } from '@/services/geminiService';
import { cleanAiName, shouldUpdateName } from '@/utils/photoImportHelpers';
import { cleanObject } from '@/services/utils';
import { resolveTagIdsBatch } from '@/utils/tagUtils';
import { safeArray } from '@/lib/utils';
import { savePhotoToCloud } from '@/services/photoMutationService';
import { QUERY_KEYS } from '@/hooks/queries/keys';
import { QueryClient } from '@tanstack/react-query';

interface ImportWorkflowProps {
  user: User | null;
  geminiApiKey: string | undefined;
  aiProvider: string;
  customModel: string;
  categories: Category[];
  tags: Tag[];
  manufacturers: Manufacturer[];
  tagNameToIdMap: Map<string, string>;
  photosRef: React.MutableRefObject<Photo[]>;
  queryClient: QueryClient;
}

export const processSinglePhoto = async (
  initialPhoto: Photo,
  props: ImportWorkflowProps,
  signal: AbortSignal,
  useAi: boolean,
  onProgressUpdate: () => void,
  invalidatePhotos: () => void
) => {
  const { 
    user, geminiApiKey, aiProvider, customModel, categories, 
    tags, manufacturers, tagNameToIdMap, photosRef, queryClient
  } = props;

  try {
    let updated = { ...initialPhoto };

    if (useAi) {
      const apiKey = geminiApiKey;
      const resRaw = await analyzeProductPhoto(initialPhoto.uri || '', categories, tags, manufacturers, apiKey || '', aiProvider, customModel, null, null, signal);
      
      const result = cleanObject(resRaw);
      const aiName = cleanAiName(result.name);
      
      if (result.description && apiKey) {
        try {
          const translations = await translateDescription(result.description, apiKey, customModel, signal);
          result.description_translations = {
            zh: result.description,
            en: translations.en,
            ms: translations.ms
          };
        } catch (e) {}
      }

      const finalTagIds = await resolveTagIdsBatch(
        Array.from(new Set([...safeArray<string>(result.tagIds), ...safeArray<string>(result.newTags)])),
        tags, tagNameToIdMap
      );

      updated = {
        ...initialPhoto,
        isAnalyzing: false,
        name: shouldUpdateName(initialPhoto.name) ? (aiName || initialPhoto.name) : initialPhoto.name,
        categoryId: result.categoryId || initialPhoto.categoryId,
        tagIds: finalTagIds.slice(0, 3),
        description: (result.description && (!initialPhoto.description || !initialPhoto.description.trim())) ? result.description : initialPhoto.description,
        description_translations: result.description_translations || initialPhoto.description_translations,
        model_number: initialPhoto.model_number || result.modelNumber || '',
        dimensions: (safeArray(result.dimensions).length > 0) ? result.dimensions : initialPhoto.dimensions
      };
      
      // Update local ref immediately
      const index = photosRef.current.findIndex(p => p.id === initialPhoto.id);
      if (index !== -1) {
         photosRef.current[index] = updated;
      }
    }

    if (user) {
      const finalPhotoId = await savePhotoToCloud(user.id, updated);
      const index = photosRef.current.findIndex(p => p.id === initialPhoto.id);
      if (index !== -1) {
        photosRef.current[index].id = finalPhotoId;
      }
      if (useAi) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
      }
    }
  } catch (err) {
    throw err;
  } finally {
    onProgressUpdate();
  }
};
