import { useState, useMemo, useCallback } from 'react';
import { useUIStore, useShallow } from '../../../store';
import { 
  useCategories, useTags, useManufacturers,
  useTagCreate, useTagEdit, useTagDelete,
  useManufacturerCreate, useManufacturerEdit, useManufacturerDelete,
  useErrorHandler, useTaskExecutor, useTasks
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
  analyzeSingle: (photo: Photo) => Promise<any>;
  saveNewPhoto: () => Promise<void>;
}

export const usePhotoEditLogic = (props: Props) => {
  const { photos, editPhotoId, formState, updateForm, newPhotoData, editPhotoPreview, analyzeSingle, saveNewPhoto } = props;
  const { tasks } = useTasks();
  const isAnalyzing = useMemo(() => tasks.some(t => t.status === 'running' && (t.name.includes('识别') || t.name.includes('分析'))), [tasks]);
  const isSyncing = useMemo(() => tasks.some(t => t.status === 'running' && (t.name.includes('同步') || t.name.includes('导入'))), [tasks]);
  const isRotating = useMemo(() => tasks.some(t => t.status === 'running' && t.name === '旋转图片'), [tasks]);
  // Use usePhotoAction for the core save operation
  const { isPending: isSavingAction, runUpdate } = usePhotoAction(editPhotoId || '', null);
  
  const isRunning = useMemo(() => isSavingAction || tasks.some(t => t.status === 'running'), [isSavingAction, tasks]);
  const aiDebugInfo = null;

  const { runTask } = useTaskExecutor();
  const { update, appLang } = useUIStore(useShallow(s => ({
    update: s.update,
    appLang: s.appLang
  })));
  const { handleError } = useErrorHandler();

  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();
  const { data: manufacturers = [] } = useManufacturers();

  const { mutateAsync: addTagMut } = useTagCreate();
  const { mutateAsync: updateTagMut } = useTagEdit();
  const { mutateAsync: deleteTagMut } = useTagDelete();
  const { mutateAsync: addManMut } = useManufacturerCreate();
  const { mutateAsync: updateManMut } = useManufacturerEdit();
  const { mutateAsync: deleteManMut } = useManufacturerDelete();


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
      if (update) {
        update({ newPhotoData: newData } as any);
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
            const m = await import('../../../services/photo/commands');
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
      handleError(new Error('AI识别上下文缺失'), 'AI识别配置错误');
    }
  };

  return {
    categories, tags, manufacturers,
    addTag, updateTag, deleteTag,
    addManufacturer, updateManufacturer, deleteManufacturer,
    rotatePhoto,
    handleSave, toggleHidden, triggerAiAnalyze,
    isAnalyzing, aiDebugInfo, isPartOfGroup, isSyncing, isRotating, isRunning,
    isSavingAction, appLang, handleError
  };
};
