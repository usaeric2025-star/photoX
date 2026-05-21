import { useState, useCallback, useEffect } from 'react';
import { User, ProductFormData, Photo } from '../types';

export const usePhotoManagement = (
  user: User | null, 
  ui: any, 
  session: any, 
  photos: Photo[],
  updatePhotoFn: (params: { id: string; updates: Partial<Photo> }) => Promise<any>,
  updateBatchFn: (params: { userId: string; ids: string[]; updates: Partial<Photo> }) => Promise<any>
) => {
  const [newPhotoData, setNewPhotoData] = useState<string | null>(null);
  const [formState, setFormState] = useState<ProductFormData>({
    name: '',
    category_id: '',
    categoryId: '',
    tag_ids: [],
    tagIds: [],
    manufacturer_id: '',
    manufacturerId: '',
    model_number: '',
    manual_code: '',
    description: '',
    is_hidden: false,
    description_translations: { en: '', ms: '' },
    dimensions: [],
    price: '',
    is_group_cover: false,
    isGroupCover: false
  });
  const [showOtherFields, setShowOtherFields] = useState(false);

  useEffect(() => {
    if (ui.editPhotoId) {
      const photo = photos.find(p => p.id === ui.editPhotoId);
      if (photo) {
        setFormState({
          name: photo.name || '',
          category_id: photo.category_id || null,
          categoryId: photo.category_id || null,
          tag_ids: photo.tag_ids || [],
          tagIds: photo.tag_ids || [],
          manufacturer_id: photo.manufacturer_id || null,
          manufacturerId: photo.manufacturer_id || null,
          model_number: photo.model_number || '',
          manual_code: photo.manual_code || '',
          description: photo.description || '',
          is_hidden: !!photo.is_hidden,
          description_translations: photo.description_translations || { en: '', ms: '' },
          dimensions: photo.dimensions || [],
          price: photo.price || '',
          is_group_cover: !!photo.is_group_cover,
          isGroupCover: !!photo.is_group_cover
        });
      }
    } else {
        // Reset if not editing
        setFormState({
            name: '',
            category_id: '',
            categoryId: '',
            tag_ids: [],
            tagIds: [],
            manufacturer_id: '',
            manufacturerId: '',
            model_number: '',
            manual_code: '',
            description: '',
            is_hidden: false,
            description_translations: { en: '', ms: '' },
            dimensions: [],
            price: '',
            is_group_cover: false,
            isGroupCover: false
        });
    }
  }, [ui.editPhotoId, photos]);

  const updateForm = useCallback((update: Partial<ProductFormData> | ((prev: ProductFormData) => ProductFormData)) => {
    setFormState(prev => {
      const next = typeof update === 'function' ? update(prev) : { ...prev, ...update };
      return next;
    });
  }, []);

  const resetAddState = useCallback(() => {
    setNewPhotoData(null);
    ui.setEditPhotoId(null);
    ui.setBatchEditIds(null);
  }, [ui]);

  const saveNewPhoto = async () => {
    if (ui.editPhotoId) {
      await updatePhotoFn({ id: ui.editPhotoId, updates: formState });
      ui.setEditPhotoId(null);
    }
  };

  const saveBatchEdit = async () => {
    if (ui.batchEditIds && ui.batchEditIds.length > 0) {
      await updateBatchFn({
        userId: user?.id || '',
        ids: ui.batchEditIds,
        updates: formState
      });
      ui.setBatchEditIds(null);
    }
  };

  return {
    newPhotoData,
    setNewPhotoData,
    formState,
    updateForm,
    showOtherFields,
    setShowOtherFields,
    resetAddState,
    saveNewPhoto,
    saveBatchEdit
  };
};
