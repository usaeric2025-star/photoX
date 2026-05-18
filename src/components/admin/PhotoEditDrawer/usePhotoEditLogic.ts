import { useState, useMemo } from 'react';
import { useGalleryStore } from '../../../store';
import { 
  useCategoriesQuery, useTagsQuery, useManufacturersQuery,
  useAddTagMutation, useUpdateTagMutation, useDeleteTagMutation,
  useAddManufacturerMutation, useUpdateManufacturerMutation, useDeleteManufacturerMutation
} from '../../../hooks';
import { Photo, ProductFormData, Tag, Manufacturer } from '../../../types';
import { useErrorHandler } from '../../../utils/errorHandler';
import { useFormValidation } from '../../../hooks/useFormValidation';

interface Props {
  editPhotoId: string | null;
  formState: ProductFormData;
  updateForm: (updates: Partial<ProductFormData>) => void;
  photos: Photo[];
  newPhotoData?: string | null;
  editPhotoPreview?: string | null;
  setNewPhotoData?: (data: string | null) => void;
  handleSingleAiAnalyze: (imageData: string | null, catId?: string, editId?: string) => Promise<any>;
  saveNewPhoto: () => Promise<void>;
}

export const usePhotoEditLogic = (props: Props) => {
  const { photos, editPhotoId, formState, updateForm, newPhotoData, editPhotoPreview, setNewPhotoData, handleSingleAiAnalyze, saveNewPhoto } = props;
  const { isAnalyzing, aiDebugInfo, setPromptDialog, setAlertDialog, withLoading, appLang, isSyncing: sessionSyncing } = useGalleryStore();
  const { handleError } = useErrorHandler();
  const { validatePhotoForm } = useFormValidation();

  const { data: categories = [] } = useCategoriesQuery();
  const { data: tags = [] } = useTagsQuery();
  const { data: manufacturers = [] } = useManufacturersQuery();

  const { mutateAsync: addTagMut } = useAddTagMutation();
  const { mutateAsync: updateTagMut } = useUpdateTagMutation();
  const { mutateAsync: deleteTagMut } = useDeleteTagMutation();
  const { mutateAsync: addManMut } = useAddManufacturerMutation();
  const { mutateAsync: updateManMut } = useUpdateManufacturerMutation();
  const { mutateAsync: deleteManMut } = useDeleteManufacturerMutation();

  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const addTag = async (name: string) => { const tag = await addTagMut(name); return tag.id; };
  const updateTag = async (id: string, updates: Partial<Tag>) => { await updateTagMut({ id, updates }); return true; };
  const deleteTag = async (id: string) => { await deleteTagMut(id); return true; };
  const addManufacturer = async (name: string) => { return await addManMut(name); };
  const updateManufacturer = async (id: string, updates: Partial<Manufacturer>) => { await updateManMut({ id, updates }); return true; };
  const deleteManufacturer = async (id: string) => { await deleteManMut(id); return true; };

  const isPartOfGroup = useMemo(() => {
    if (!editPhotoId) return false;
    const photo = photos.find(p => p.id === editPhotoId);
    return !!(photo && photo.groupId);
  }, [editPhotoId, photos]);

  const rotatePhoto = async () => {
    const src = newPhotoData || editPhotoPreview;
    if (!src) return;

    setIsProcessingImage(true);
    try {
      const img = new Image();
      if (src.startsWith('http')) img.crossOrigin = 'Anonymous';
      img.src = src;
      await img.decode();

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.height;
      canvas.height = img.width;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      const newData = canvas.toDataURL('image/jpeg', 0.95);
      if (setNewPhotoData) {
        setNewPhotoData(newData);
      }
    } catch (err) {
      handleError(err, '图像旋转处理失败');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleSave = async () => {
    const { valid, errors } = validatePhotoForm(formState);
    if (!valid) {
      handleError(new Error(errors[0]), '表單驗證失敗');
      return;
    }
    await saveNewPhoto();
  };

  const toggleHidden = async () => {
    const nextValue = !formState.is_hidden;
    updateForm({ is_hidden: nextValue }); // optimistic
    
    if (editPhotoId) {
        try {
            await withFeedback(async () => {
                const m = await import('../../../services/photoMutationService');
                await m.updatePhotoHidden(editPhotoId, nextValue);
            }, `照片已${nextValue ? '隐藏' : '显示'}`);
        } catch (e) {
            // Rollback on failure
            updateForm({ is_hidden: !nextValue });
            handleError(e, '自动保存可见性失败');
        }
    }
  };

  const triggerAiAnalyze = () => {
    if (isAnalyzing) return;
    const data = newPhotoData || editPhotoPreview;
    if (!data) return;
    
    if (handleSingleAiAnalyze) {
      withLoading('analyzing', () => handleSingleAiAnalyze(data, formState.categoryId || undefined, editPhotoId || undefined)).catch(()=>{});
    } else {
      handleError(new Error('AI识别上下文缺失'), 'AI识别配置错误');
    }
  };

  return {
    categories, tags, manufacturers,
    addTag, updateTag, deleteTag,
    addManufacturer, updateManufacturer, deleteManufacturer,
    isProcessingImage, rotatePhoto,
    handleSave, toggleHidden, triggerAiAnalyze,
    isAnalyzing, aiDebugInfo, isPartOfGroup, sessionSyncing,
    setPromptDialog, setAlertDialog, withLoading, appLang, handleError
  };
};
