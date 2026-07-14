import { logger } from '#lib/logger.js';
import { showToast } from '#lib/ui/toast.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { createContext, useCallback, useContext, useMemo } from 'react';
import { useForm } from '@tanstack/react-form';
import { useAppForm } from '#lib/forms/useAppForm.js';
import { useCategories } from '../category/useCategories.js';
import { useManufacturers } from '../manufacturer/useManufacturers.js';
import { useTranslation } from '../core/index.js';
import { useTags } from '../tag/useTags.js';
import { usePhoto, usePhotoMutations } from './usePhotos.js';
import { PhotoEditSchema, type PhotoEditFormData } from '#lib/valibot/schemas/photo.js';
import { photoEditAdapter } from '#lib/forms/index.js';
import { generateItemCode } from '#src/utils/photo.js';
import { toSingleString, toMultiObject } from '#lib/forms/utils.js';
import { Photo, Tag } from '#src/types/index.js';
import { PhotoAIAdapterRegistry } from '#src/features/ai/types.js';
import { resolveTagNamesToIds } from '#src/features/ai/tagCompletion.js';
import { useEffect } from 'react';

interface PhotoEditSessionContextValue {
  isDirty: boolean;
  isPending: boolean;
  isSubmitting: boolean;
  commit: (data?: PhotoEditFormData) => Promise<void>;
  discard: () => void;
  form: ReturnType<typeof useAppForm<PhotoEditFormData>>['form'];
  photoId: string;
}

export const PhotoEditSessionContext = createContext<PhotoEditSessionContextValue | undefined>(undefined);

interface PhotoEditSessionProps {
  photoId: string;
  children: React.ReactNode;
  onSuccess?: () => void;
}

export const PhotoEditSessionProvider = ({ 
  photoId, 
  children, 
  onSuccess 
}: PhotoEditSessionProps) => {
  const { data: photo, isPending } = usePhoto(photoId);
  const { editPhotoAsync } = usePhotoMutations();
  const { categories = [] } = useCategories();
  const { manufacturers = [] } = useManufacturers();
  const { tags: allTags = [] } = useTags();
  const { t } = useTranslation();
  
  const defaultValues = useMemo(() => {
    const p = (photo || {}) as Partial<Photo>;
    const metadata = (p.metadata || {}) as Record<string, any>;
    
    // Initial fields from database
    let name = toSingleString(p.name);
    let description = toMultiObject(p.description);
    let categoryId = p.categoryId ?? null;
    let groupId = p.groupId ?? null;
    let tags = p.tags ?? null;
    let dimensions = p.dimensions ?? null;
    let itemCode = p.itemCode ?? null;

    // 📌 [User Request] Auto-populate from ai_raw if fields are empty
    // This handles cases where background analysis (batch) only saved raw AI result but didn't fill fields
    if (metadata.ai_raw) {
      try {
        let rawJson = metadata.ai_raw;
        if (typeof rawJson === 'string') {
          const cleanRaw = rawJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          rawJson = JSON.parse(cleanRaw);
        }
        
        if (rawJson) {
          const adapter = PhotoAIAdapterRegistry.getAdapter('gemini');
          const normalized = adapter.normalize(rawJson, typeof metadata.ai_raw === 'string' ? metadata.ai_raw : JSON.stringify(metadata.ai_raw));
          
          // Granular check for each field to avoid blocking dimensions by name presence
          // We check for '---' as it's our default placeholder for empty records
          const isNameEmpty = !name || name === '---' || name === '';
          if (normalized.name && isNameEmpty) {
            name = normalized.name.replace(/\.(jpg|jpeg|png|webp|gif|bmp)$/i, '').trim();
          }
          
          const isDescEmpty = !description.zh || description.zh === '---' || description.zh === '';
          if (normalized.description && isDescEmpty) {
            description = {
              zh: normalized.description.zh || '',
              en: normalized.description.en || normalized.description.zh || '',
              ms: normalized.description.ms || normalized.description.zh || '',
            };
          }
          
          if (normalized.categoryId && !categoryId) categoryId = normalized.categoryId;
          if (normalized.groupId && !groupId) groupId = normalized.groupId;
          
          const isDimsEmpty = !dimensions || dimensions.length === 0;
          if (normalized.dimensions && normalized.dimensions.length > 0 && isDimsEmpty) {
            dimensions = normalized.dimensions.map(d => ({
              ...d,
              id: d.id || crypto.randomUUID(), // Ensure ID for form key mapping
              isAi: true,
              isAiEstimated: true
            }));
          }
        }
      } catch (e) {
        logger.warn('[PhotoEditSession] Failed to auto-parse ai_raw into defaults:', e);
      }
    }

    return {
      name,
      description,
      categoryId,
      manufacturerId: p.manufacturerId ?? null,
      groupId,
      isGroupCover: p.isGroupCover ?? false,
      price: p.price ?? null,
      note: p.note ?? null,
      manualCode: p.manualCode ?? null,
      modelNumber: p.modelNumber ?? null,
      dimensions,
      isHidden: p.isHidden ?? false,
      tags,
      itemCode,
    } as unknown as PhotoEditFormData;
  }, [photo]);

  const onSubmit = useCallback(async (values: PhotoEditFormData) => {
    // Validate selections against existing arrays
    if (values.categoryId && !categories.find(c => String(c.id) === String(values.categoryId))) {
      values.categoryId = null;
    }
    if (values.manufacturerId && !manufacturers.find(m => String(m.id) === String(values.manufacturerId))) {
      values.manufacturerId = null;
    }

    // Auto-generate itemCode if missing
    if (!values.itemCode) {
      const newCode = generateItemCode();
      values.itemCode = newCode;
      // We will rely on SWR optimistic updates instead of mutating the form immediately
    }
    
    // Convert using our strict Adapter
    const saveData = photoEditAdapter(values, photoId, {
      tags: Array.isArray(values.tags) 
        ? (values.tags as (Tag | string)[]).map((t) => typeof t === 'object' ? String(t.id ?? '') : String(t)).filter(Boolean) 
        : null,
      createdAt: photo?.createdAt,
      updatedAt: new Date().toISOString(),
    } as Record<string, unknown>);
    
    await editPhotoAsync({
      id: photoId,
      updates: saveData as unknown as Partial<Photo>
    });
    
    showToast.success(t('saveSuccess') || 'Saved successfully');
    
    onSuccess?.();
  }, [photoId, photo?.tags, photo?.createdAt, editPhotoAsync, onSuccess, categories, manufacturers, t]);

  const formObj = useAppForm({
    schema: PhotoEditSchema,
    defaultValues,
    onSubmit
  });

  // 📌 [Fix] Sync form with defaultValues when they change (e.g. after photo data loads or AI raw is parsed)
  // Only reset if form is not dirty to avoid overwriting user edits
  useEffect(() => {
    if (photo && !formObj.form.state.isDirty) {
      logger.debug('[PhotoEditSession] Syncing form with latest defaultValues');
      formObj.form.reset(defaultValues);
    }
  }, [defaultValues, formObj.form, photo]);

  // 📌 [User Request] Tags Auto-Selection if missing but available in ai_raw
  useEffect(() => {
    if (!photo || !photo.metadata?.ai_raw || allTags.length === 0) return;
    
    // Check if form currently has no tags
    const currentTags = formObj.form.getFieldValue('tags');
    if (currentTags && currentTags.length > 0) return;

    // Check if defaultValues already has tags (resolved from DB)
    if (defaultValues.tags && defaultValues.tags.length > 0) return;

    const resolveAITags = async () => {
      try {
        let rawJson = photo.metadata!.ai_raw;
        if (typeof rawJson === 'string') {
          const cleanRaw = rawJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          rawJson = JSON.parse(cleanRaw);
        }
        
        if (rawJson) {
          const adapter = PhotoAIAdapterRegistry.getAdapter('gemini');
          const normalized = adapter.normalize(rawJson, String(photo.metadata!.ai_raw));
          
          if (normalized.tagNames && normalized.tagNames.length > 0) {
            const resolvedIds = await resolveTagNamesToIds(normalized.tagNames, allTags);
            if (resolvedIds && resolvedIds.length > 0) {
              const matchedTags = resolvedIds
                .map(id => allTags.find(t => String(t.id) === String(id)))
                .filter(Boolean) as Tag[];
              
              if (matchedTags.length > 0) {
                logger.debug('[PhotoEditSession] Auto-populating tags from AI raw', matchedTags.map(t => t.name));
                // Use a small timeout to ensure form has settled
                setTimeout(() => {
                  formObj.form.setFieldValue('tags', matchedTags);
                }, 100);
              }
            }
          }
        }
      } catch (e) {
        // Silently fail for auto-population
      }
    };

    resolveAITags();
  }, [photo, allTags, formObj.form, defaultValues.tags]);
  
  const handleCommit = useCallback(async (data?: PhotoEditFormData) => {
    if (data) {
      Object.entries(data).forEach(([key, value]) => formObj.form.setFieldValue(key as keyof PhotoEditFormData, value as never));
    }
    
    try {
      logger.debug('[PhotoEdit] Committing form data...');
      await formObj.form.handleSubmit();
      
      const state = formObj.form.state;
      const hasErrors = Object.keys(state.errors).length > 0 || (state.fieldMeta && Object.values(state.fieldMeta).some(m => m?.errorMap?.onChange));
      
      if (hasErrors) {
         logger.warn('[PhotoEdit] Form validation failed', state.errors);
         return;
      }
    } catch (err) {
      const error = err as Error;
      logger.error('[PhotoEdit] Commit failed:', error);
      ErrorFactory.handle(error, { context: 'PhotoEdit.commit' });
    }
  }, [formObj]);

  const discard = () => {
    formObj.form.reset();
  };
  
  return (
    <PhotoEditSessionContext.Provider value={{ 
      isDirty: formObj.form.state.isDirty,
      isPending,
      isSubmitting: formObj.form.state.isSubmitting,
      commit: handleCommit, 
      discard,
      form: formObj.form,
      photoId
    }}>
      {children}
    </PhotoEditSessionContext.Provider>
  );
}
