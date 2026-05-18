import { useState, useCallback } from 'react';
import { User, ProductFormData, Photo } from '../types';

export const usePhotoManagement = (user: User | null, ui: any, session: any) => {
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

  const saveNewPhoto = async () => {};
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
