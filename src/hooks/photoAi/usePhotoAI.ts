import { useMemo } from 'react';
import { Photo, Category, Tag, Manufacturer, User } from '@/types';
import { usePhotoAIBase } from './usePhotoAIBase';
import { usePhotoAISingle } from './usePhotoAISingle';
import { usePhotoAIBatch } from './usePhotoAIBatch';
import { usePhotoAIGroup } from './usePhotoAIGroup';

export const usePhotoAI = (
  user: User | null,
  geminiApiKey: string | undefined,
  aiProvider: string,
  customModel: string,
  categories: Category[],
  tags: Tag[],
  manufacturers: Manufacturer[],
  tagNameToIdMap: Map<string, string>,
  photosRef: React.MutableRefObject<Photo[]>
) => {
  const base = usePhotoAIBase();
  
  const single = usePhotoAISingle(
    user, geminiApiKey, aiProvider, customModel, 
    categories, tags, manufacturers, base
  );
  
  const batch = usePhotoAIBatch(
    user, geminiApiKey, aiProvider, customModel, 
    categories, tags, manufacturers, tagNameToIdMap, base
  );
  
  const group = usePhotoAIGroup(
    user, geminiApiKey, aiProvider, customModel, 
    categories, tags, manufacturers, tagNameToIdMap, base
  );

  return useMemo(() => ({
    ...base,
    ...single,
    ...batch,
    ...group
  }), [base, single, batch, group]);
};

