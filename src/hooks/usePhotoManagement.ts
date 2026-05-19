import { useState, useCallback, useEffect } from 'react';
import { User, ProductFormData, Photo } from '../types';

export const usePhotoManagement = (
  user: User | null, 
  ui: any, 
  session: any, 
  photos: Photo[],
  updatePhotoFn: (id: string, updates: Partial<Photo>) => Promise<any>
) => {
  const [newPhotoData, setNewPhotoData] = useState<string | null>(null);
  const [formState, setFormState] = useState<ProductFormData>({
    name: '',
    categoryId: '',
    tagIds: [],
    manufacturerId: '',
    model_number: '',
    manual_code: '',
    description: '',
    is_hidden: false,
    description_translations: { en: '', ms: '' },
    dimensions: [],
    price: '',
    isGroupCover: false
  });
  const [showOtherFields, setShowOtherFields] = useState(false);

  useEffect(() => {
    if (ui.editPhotoId) {
      const photo = photos.find(p => p.id === ui.editPhotoId);
      if (photo) {
        setFormState({
          name: photo.name || '',
          categoryId: photo.categoryId || '',
          tagIds: photo.tagIds || [],
          manufacturerId: photo.manufacturerId || '',
          model_number: photo.model_number || '',
          manual_code: photo.manual_code || '',
          description: photo.description || '',
          is_hidden: !!photo.is_hidden,
          description_translations: photo.description_translations || { en: '', ms: '' },
          dimensions: photo.dimensions || [],
          price: photo.price || '',
          isGroupCover: !!photo.isGroupCover
        });
      }
    } else {
        // Reset if not editing
        setFormState({
            name: '',
            categoryId: '',
            tagIds: [],
            manufacturerId: '',
            model_number: '',
            manual_code: '',
            description: '',
            is_hidden: false,
            description_translations: { en: '', ms: '' },
            dimensions: [],
            price: '',
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
      await updatePhotoFn(ui.editPhotoId, formState);
    }
  };
  const saveBatchEdit = async () => {};

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
