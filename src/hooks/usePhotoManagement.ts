import { useCallback, useEffect, useRef } from 'react';
import { User, ProductFormData, Photo } from '../types';
import { useGalleryStore, useShallow } from '../store';

export const usePhotoManagement = (
  user: User | null, 
  ui: any, 
  session: any, 
  photos: Photo[],
  updatePhotoFn: (params: { id: string; updates: Partial<Photo> }) => Promise<any>,
  updateBatchFn: (params: { userId: string; ids: string[]; updates: Partial<Photo> }) => Promise<any>
) => {
  const { 
    formState, updateForm, newPhotoData, setNewPhotoData, 
    showOtherFields, setShowOtherFields 
  } = useGalleryStore(useShallow(s => ({
    formState: s.formState,
    updateForm: s.updateForm,
    newPhotoData: s.newPhotoData,
    setNewPhotoData: s.setNewPhotoData,
    showOtherFields: s.showOtherFields,
    setShowOtherFields: s.setShowOtherFields
  })));

  const setFormState = useCallback((val: ProductFormData) => {
    useGalleryStore.setState({ formState: val });
  }, []);

  const loadedPhotoId = useRef<string | null>(null);

  useEffect(() => {
    if (ui.editPhotoId) {
      if (ui.editPhotoId !== loadedPhotoId.current) {
        const photo = photos.find(p => p.id === ui.editPhotoId);
        if (photo) {
          setFormState({
            name: photo.name || '',
            category_id: photo.category_id || null,
            tag_ids: photo.tag_ids || [],
            manufacturer_id: photo.manufacturer_id || null,
            model_number: photo.model_number || '',
            manual_code: photo.manual_code || '',
            description: photo.description || '',
            is_hidden: !!photo.is_hidden,
            description_translations: photo.description_translations || { en: '', ms: '' },
            dimensions: photo.dimensions || [],
            price: photo.price || '',
            is_group_cover: !!photo.is_group_cover
          });
          loadedPhotoId.current = ui.editPhotoId;
        }
      }
    } else {
        // Reset if not editing
        setFormState({
            name: '',
            category_id: '',
            tag_ids: [],
            manufacturer_id: '',
            model_number: '',
            manual_code: '',
            description: '',
            is_hidden: false,
            description_translations: { en: '', ms: '' },
            dimensions: [],
            price: '',
            is_group_cover: false
        });
        loadedPhotoId.current = null;
    }
  }, [ui.editPhotoId, photos]);

  const resetAddState = useCallback(() => {
    setNewPhotoData(null);
    ui.setEditPhotoId(null);
    ui.setBatchEditIds(null);
  }, [ui, setNewPhotoData]);

  const saveNewPhoto = useCallback(async () => {
    if (ui.editPhotoId) {
      await updatePhotoFn({ 
        id: ui.editPhotoId, 
        updates: {
          ...formState,
          uri: newPhotoData || undefined
        } 
      });
      resetAddState();
    }
  }, [ui, updatePhotoFn, formState, newPhotoData, resetAddState]);

  const saveBatchEdit = useCallback(async () => {
    if (ui.batchEditIds && ui.batchEditIds.length > 0) {
      await updateBatchFn({
        userId: user?.id || '',
        ids: ui.batchEditIds,
        updates: formState
      });
      ui.setBatchEditIds(null);
    }
  }, [ui, updateBatchFn, user, formState]);

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
