import { useState, useMemo, useCallback } from 'react';
import { useGalleryStore } from '../../../store';
import { 
  useCategoriesQuery, useTagsQuery, useManufacturersQuery,
  useAddTagMutation, useUpdateTagMutation, useDeleteTagMutation,
  useAddManufacturerMutation, useUpdateManufacturerMutation, useDeleteManufacturerMutation,
  useFeedback, useTaskExecutor, useTasks
} from '../../../hooks';
import { Photo, ProductFormData, Tag, Manufacturer } from '../../../types';
import { usePhotoAction } from '@/hooks/core/usePhotoAction';

interface Props {
  editPhotoId: string | null;
  formState: ProductFormData;
  updateForm: (updates: Partial<ProductFormData>) => void;
  photos: Photo[];
  newPhotoData?: string | null;
  editPhotoPreview?: string | null;
  setNewPhotoData?: (data: string | null) => void;
  analyzeSingle: (photo: Photo) => Promise<any>;
  saveNewPhoto: () => Promise<void>;
}

export const usePhotoEditLogic = (props: Props) => {
  const { photos, editPhotoId, formState, updateForm, newPhotoData, editPhotoPreview, setNewPhotoData, analyzeSingle, saveNewPhoto } = props;
  const { tasks } = useTasks();
  const isAnalyzing = useMemo(() => tasks.some(t => t.status === 'running' && (t.name.includes('识别') || t.name.includes('分析'))), [tasks]);
  const isSyncing = useMemo(() => tasks.some(t => t.status === 'running' && (t.name.includes('同步') || t.name.includes('导入'))), [tasks]);
  const isRotating = useMemo(() => tasks.some(t => t.status === 'running' && t.name === '旋转图片'), [tasks]);
  // Use usePhotoAction for the core save operation
  const { isPending: isSavingAction, runUpdate } = usePhotoAction(editPhotoId || '', null);
  
  const isRunning = useMemo(() => isSavingAction || tasks.some(t => t.status === 'running'), [isSavingAction, tasks]);
  const aiDebugInfo = null;

  const { runTask } = useTaskExecutor();
  const setPromptDialog = useGalleryStore(s => s.setPromptDialog);
  const setAlertDialog = useGalleryStore(s => s.setAlertDialog);
  const appLang = useGalleryStore(s => s.appLang);
  const { showError, showSuccess } = useFeedback();

  const { data: categories = [] } = useCategoriesQuery();
  const { data: tags = [] } = useTagsQuery();
  const { data: manufacturers = [] } = useManufacturersQuery();

  const { mutateAsync: addTagMut } = useAddTagMutation();
  const { mutateAsync: updateTagMut } = useUpdateTagMutation();
  const { mutateAsync: deleteTagMut } = useDeleteTagMutation();
  const { mutateAsync: addManMut } = useAddManufacturerMutation();
  const { mutateAsync: updateManMut } = useUpdateManufacturerMutation();
  const { mutateAsync: deleteManMut } = useDeleteManufacturerMutation();


  const addTag = async (name: string) => { const tag = await addTagMut(name); return tag.id; };
  const updateTag = async (id: string, updates: Partial<Tag>) => { await updateTagMut({ id, updates }); return true; };
  const deleteTag = async (id: string) => { await deleteTagMut(id); return true; };
  const addManufacturer = async (name: string) => { return await addManMut(name); };
  const updateManufacturer = async (id: string, updates: Partial<Manufacturer>) => { await updateManMut({ id, updates }); return true; };
  const deleteManufacturer = async (id: string) => { await deleteManMut(id); return true; };

  const isPartOfGroup = useMemo(() => {
    if (!editPhotoId) return false;
    const photo = photos.find(p => p.id === editPhotoId);
    return !!(photo && photo.group_id);
  }, [editPhotoId, photos]);

  const rotatePhoto = async () => {
    const src = newPhotoData || editPhotoPreview;
    if (!src) return;

    await runTask('旋转图片', async () => {
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
    }, { showSuccessToast: true, silent: true });
  };

  const handleSave = async () => {
    if (!editPhotoId) return;
    // [V2.8] Use the R19 Action Paradigm
    runUpdate(formState);
  };

  const toggleHidden = async () => {
    const nextValue = !formState.is_hidden;
    updateForm({ is_hidden: nextValue }); // optimistic
    
    if (editPhotoId && !editPhotoId.startsWith('temp-')) {
        await runTask('更新可见性', async () => {
            const m = await import('../../../services/photoService');
            await m.updatePhotoHidden(editPhotoId, nextValue);
        }, { showSuccessToast: true, silent: true });
    } else {
        console.warn('Cannot toggle hidden: invalid photoId', editPhotoId);
    }
  };

  const triggerAiAnalyze = () => {
    if (isAnalyzing) return;
    const data = newPhotoData || editPhotoPreview;
    if (!data) return;
    
    if (analyzeSingle) {
      const p = { 
        id: editPhotoId || '', uri: data, image_url: data, 
        category_id: formState.category_id || undefined 
      } as Photo;
      analyzeSingle(p).catch(()=>{});
    } else {
      showError(new Error('AI识别上下文缺失'), 'AI识别配置错误');
    }
  };

  return {
    categories, tags, manufacturers,
    addTag, updateTag, deleteTag,
    addManufacturer, updateManufacturer, deleteManufacturer,
    rotatePhoto,
    handleSave, toggleHidden, triggerAiAnalyze,
    isAnalyzing, aiDebugInfo, isPartOfGroup, isSyncing, isRotating, isRunning,
    isSavingAction,
    setPromptDialog, setAlertDialog, appLang, showError
  };
};
