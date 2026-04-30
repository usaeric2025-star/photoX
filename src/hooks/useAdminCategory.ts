import { useState, useEffect, useRef } from 'react';
import { Category, Tag, SubCategory, Photo } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_TAGS } from '../constants';
import { loadData, saveData } from '../utils/indexedDB';
import { useGalleryContext } from '../context/GalleryContext';
import { 
  updateTagInDB, 
  deleteTagFromDB, 
  updateCategoryInDB, 
  deleteCategoryFromDB, 
  addCategoryToDB,
  addManufacturerToDB,
  updateManufacturerInDB,
  deleteManufacturerFromDB,
  savePhotoToCloud,
  supabase
} from '../services/supabaseService';

export const useAdminCategory = (adminUI: any) => {
  const { setAlertDialog = () => {}, setConfirmDialog = () => {} } = adminUI || {};

  const {
    categories, setCategories,
    tags, setTags,
    manufacturers, setManufacturers,
    photos, setPhotos
  } = useGalleryContext();

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const [publicCategories, setPublicCategories] = useState<Category[]>([]);
  const [publicTags, setPublicTags] = useState<Tag[]>([]);
  const [publicManufacturers, setPublicManufacturers] = useState<SubCategory[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadInit = async () => {
      const storedCats = await loadData('product_categories');
      if (Array.isArray(storedCats)) setCategories(storedCats);
      else if (categories.length === 0) setCategories(DEFAULT_CATEGORIES);

      const storedTags = await loadData('product_tags');
      if (Array.isArray(storedTags)) setTags(storedTags);
      else if (tags.length === 0) setTags(DEFAULT_TAGS);

      const storedMfrs = await loadData('product_manufacturers');
      if (storedMfrs) setManufacturers(storedMfrs);
      
      setIsLoaded(true);
    };
    loadInit();
  }, [setCategories, setTags, setManufacturers]); // Add setters if needed, but they are constant from useGalleryContext memo

  // Persist categories/tags/manufacturers locally
  useEffect(() => {
    if (!isLoaded) return;
    const persist = async () => {
      await saveData('product_categories', categories);
      await saveData('product_tags', tags);
      await saveData('product_manufacturers', manufacturers);
    };
    persist();
  }, [categories, tags, manufacturers, isLoaded]);

  const updateTag = async (tagId: string, newName: string) => {
    try {
      const upName = newName.toUpperCase().trim();
      if (!upName) return;
      
      const nextTags = tags.map(t => String(t.id) === String(tagId) ? { ...t, name: upName } : t);
      setTags(nextTags);
      await saveData('product_tags', nextTags);
      
      const success = await updateTagInDB(tagId, upName);
      if (!success) {
        throw new Error("Cloud update failed");
      }
    } catch (err: any) {
      console.error("Cloud tag update failed:", err);
      // Revert local state if cloud failed
      const storedTags = await loadData('product_tags');
      if (storedTags) setTags(storedTags);
      setAlertDialog({ title: '更新失敗', message: '無法同步更新到雲端。' });
    }
  };

  const deleteTag = async (id: string | number) => {
    if (!id) return;

    alert('准备弹出确认框，onConfirm type：' + typeof (async () => {}));
    setConfirmDialog({
      title: '确认删除标签 / Confirm Delete Tag',
      message: '确定要删除这个标签吗？ / Are you sure you want to delete this tag?',
      danger: true,
      onConfirm: async () => {
        try {
          const strId = String(id);
          
          // 1. 统计有多少照片包含这个标签
          const { data: photosWithTag } = await supabase
            .from('furniture_items')
            .select('id, tagIds')
            .contains('tagIds', [strId]);

          const count = photosWithTag?.length || 0;
          
          if (count > 0 && photosWithTag) {
            const confirmAgain = confirm(`此标签关联了 ${count} 张照片，删除后会从这些照片的标签列表中移除。确定继续吗？ / This tag is associated with ${count} photos. Removing it will update those photos. Proceed?`);
            if (!confirmAgain) return;

            for (const photo of photosWithTag) {
              const newTagIds = (photo.tagIds || []).filter(tid => String(tid) !== strId);
              const { error } = await supabase
                .from('furniture_items')
                .update({ tagIds: newTagIds })
                .eq('id', photo.id);
              if (error) throw error;
            }
          }

          // 3. 删除标签
          const finalId = !isNaN(Number(id)) ? Number(id) : id;
          const success = await deleteTagFromDB(finalId);
          
          if (!success) {
            throw new Error("无法在云端删除标签。请确认您有足够的权限，或该标签已被删除。 / Unable to delete tag from cloud.");
          }

          // 4. 更新本地状态
          const newTags = Array.isArray(tags)
            ? tags.filter(t => String(t.id) !== strId)
            : [];
          
          if (isMounted.current) {
            setTags(newTags);
            await saveData('product_tags', newTags);
          }

          // 5. Update local photo state
          const nextPhotos = photos.map(p => ({
            ...p,
            tagIds: (p.tagIds || []).filter(tid => String(tid) !== strId)
          }));
          
          if (isMounted.current) {
            setPhotos(nextPhotos);
            await saveData('product_photos', nextPhotos);
          }

          alert('标签删除成功 / Tag deleted successfully');
        } catch (err: any) {
          console.error("[useAdminCategory] Tag deletion failed:", err);
          if (isMounted.current) {
            alert('标签删除失败：' + err.message);
          }
          throw err;
        }
      }
    });
  };

  const addCategory = async (name: string) => {
    try {
      const trimmed = name.trim();
      if (!trimmed) return;
      const saved = await addCategoryToDB(trimmed);
      if (saved) {
        const nextCategories = [...categories, saved];
        setCategories(nextCategories);
        await saveData('product_categories', nextCategories);
      }
    } catch (err: any) {
      console.error("[useAdminCategory] Add category failed:", err);
      setAlertDialog({ title: '添加分类失败', message: err.message || '网络连接或数据库权限问题' });
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      const nextCategories = categories.map(c => String(c.id) === String(id) ? { ...c, ...updates } : c);
      setCategories(nextCategories);
      await saveData('product_categories', nextCategories);
      await updateCategoryInDB(id, updates);
    } catch (err) {
      // Log suppressed
    }
  };

  const deleteCategory = async (id: string) => {
    setConfirmDialog({
      title: '确认删除分类 / Confirm Delete Category',
      message: '确定要删除这个分类吗？ / Are you sure you want to delete this category?',
      danger: true,
      onConfirm: async () => {
        try {
          const strId = String(id);
          
          // 1. 统计有多少照片关联这个分类
          const { count } = await supabase
            .from('furniture_items')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', strId);

          // 2. 清空照片的 category_id
          if (count && count > 0) {
            const confirmAgain = confirm(`此分类关联了 ${count} 张照片，删除后这些照片的分类将变为「未分类」。确定继续吗？ / This category has ${count} photos. They will become "Uncategorized". Proceed?`);
            if (!confirmAgain) return;

            const { error } = await supabase
              .from('furniture_items')
              .update({ category_id: null })
              .eq('category_id', strId);
            if (error) throw error;
          }

          // 3. 删除分类
          const success = await deleteCategoryFromDB(strId);
          if (!success) throw new Error("无法在云端删除分类。 / Unable to delete category from cloud.");

          // 4. 更新本地状态
          const nextCategories = categories.filter(c => String(c.id) !== strId);
          if (isMounted.current) {
            setCategories(nextCategories);
            await saveData('product_categories', nextCategories);
          }
          
          // 5. 更新照片在内存中的状态
          const nextPhotos = photos.map(p => String(p.categoryId) === strId ? { ...p, categoryId: null } : p);
          
          if (isMounted.current) {
            setPhotos(nextPhotos);
            await saveData('product_photos', nextPhotos);
          }

          // 6. Sync affected photos to cloud
          const affectedPhotos = nextPhotos.filter((p, i) => 
            String(photos[i].categoryId) === strId
          );

          if (affectedPhotos.length > 0) {
            const { data: { user: userObj } } = await supabase.auth.getUser();
            if (userObj) {
              await Promise.allSettled(
                affectedPhotos.map(p => savePhotoToCloud(userObj.id, p))
              );
            }
          }
          alert('分类删除成功 / Category deleted successfully');
        } catch (err: any) {
          console.error("[useAdminCategory] Category deletion failed:", err);
          if (isMounted.current) {
            alert('分类删除失败：' + err.message);
          }
        }
      }
    });
  };

  const addManufacturer = async (name: string) => {
    try {
      const saved = await addManufacturerToDB(name);
      const newMfrs = [...manufacturers, saved];
      setManufacturers(newMfrs);
      await saveData('product_manufacturers', newMfrs);
      return saved;
    } catch (err: any) {
      console.error("[useAdminCategory] Add manufacturer failed:", err);
      setAlertDialog({ title: '添加厂商失败', message: err.message || '网络连接或数据库权限问题' });
    }
  };

  const updateManufacturer = async (id: string | number, name: string) => {
    try {
      const strId = String(id);
      const trimmed = name.trim();
      await updateManufacturerInDB(strId, trimmed);
      const newMfrs = manufacturers.map(m => 
        String(m.id) === strId ? { ...m, name: trimmed } : m
      );
      setManufacturers(newMfrs);
      await saveData('product_manufacturers', newMfrs);
    } catch (err: any) {
      console.error("[useAdminCategory] Update manufacturer failed:", err);
      setAlertDialog({ title: '更新厂商失败', message: err.message || '网络连接或数据库权限问题' });
    }
  };

  const deleteManufacturer = async (id: string | number) => {
    setConfirmDialog({
      title: '确认删除厂商 / Confirm Delete Manufacturer',
      message: '确定要删除这个厂商吗？ / Are you sure you want to delete this manufacturer?',
      danger: true,
      onConfirm: async () => {
        try {
          console.log(`[useAdminCategory] Confirm deletion for manufacturer: ${id}`);
          const strId = String(id);
          
          // 1. 统计有多少照片关联这个厂商
          const { count } = await supabase
            .from('furniture_items')
            .select('*', { count: 'exact', head: true })
            .eq('manufacturer_id', strId);
          
          // 2. 清空照片的 manufacturer_id
          if (count && count > 0) {
            const confirmAgain = confirm(`此厂商关联了 ${count} 张照片，删除后这些照片的厂商将变为「未选择」。确定继续吗？ / This manufacturer has ${count} photos. Their manufacturer info will be cleared. Proceed?`);
            if (!confirmAgain) return;

            const { error } = await supabase
              .from('furniture_items')
              .update({ manufacturer_id: null })
              .eq('manufacturer_id', strId);
            if (error) throw error;
          }

          // 3. Delete manufacturer
          const success = await deleteManufacturerFromDB(strId);
          console.log(`[useAdminCategory] Cloud delete result for manufacturer ${id}:`, success);
          if (!success) throw new Error("無法刪除廠商 / Unable to delete manufacturer");

          // 4. Update local state
          const newMfrs = manufacturers.filter(m => String(m.id) !== strId);
          setManufacturers(newMfrs);
          await saveData('product_manufacturers', newMfrs);
          
          // Update photos in memory
          const nextPhotos = photos.map(p => 
            String(p.manufacturerId) === strId ? { ...p, manufacturerId: null } : p
          );
          
          if (isMounted.current) {
            setPhotos(nextPhotos);
            await saveData('product_photos', nextPhotos);
          }

          // Sync affected photos to cloud
          const affectedPhotos = nextPhotos.filter((p, i) => 
            String(photos[i].manufacturerId) === strId
          );

          if (affectedPhotos.length > 0) {
            const { data: { user: userObj } } = await supabase.auth.getUser();
            if (userObj) {
              await Promise.allSettled(
                affectedPhotos.map(p => savePhotoToCloud(userObj.id, p))
              );
            }
          }
          alert('删除成功 / Manufacturer deleted successfully');
        } catch (err: any) {
           console.error("[useAdminCategory] Manufacturer deletion failed:", err);
           alert('删除失败：' + err.message);
        }
      }
    });
  };

  return {
    categories, setCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    tags, setTags,
    updateTag,
    deleteTag,
    manufacturers, setManufacturers,
    addManufacturer,
    updateManufacturer,
    deleteManufacturer,
    publicCategories, setPublicCategories,
    publicTags, setPublicTags,
    publicManufacturers, setPublicManufacturers
  };
};
