import { Category, Tag, Manufacturer } from '../../types';
import { normalizeTagName, normalizeManufacturerName } from '../../utils/stringHelper';

export const useSettingsActions = (
    setPromptDialog: (dialog: any) => void,
    addCategory: (name: string) => Promise<any>,
    updateCategory: (data: any) => Promise<any>,
    addManufacturer: (name: string) => Promise<any>,
    updateManufacturer: (id: string, name: string) => Promise<any>,
    addTag: (name: string) => Promise<any>,
    updateTag: (id: string, name: string) => Promise<any>
) => {

    const handleAddManufacturer = () => {
        setPromptDialog({
            title: '新增生产商',
            message: '输入生产商名称:',
            onSubmit: async (name: string) => {
                if (!name.trim()) return;
                await addManufacturer(name.trim());
            }
        });
    };

    const handleUpdateTagName = (tag: Tag) => {
        setPromptDialog({
            title: '编辑标签名 / Edit Tag Name',
            message: '输入新的标签名称 / Enter new tag name:',
            placeholder: tag.name,
            onSubmit: async (newName: string) => {
                const normalized = normalizeTagName(newName);
                if (normalized && normalized !== tag.name) {
                    await updateTag(tag.id, normalized);
                }
            }
        });
    };

    const handleUpdateMfrName = async (mfr: Manufacturer) => {
        setPromptDialog({
            title: '编辑生产商 / Edit Manufacturer',
            message: '输入新名称 / Enter new name:',
            placeholder: mfr.name,
            onSubmit: async (newName: string) => {
                const normalized = normalizeManufacturerName(newName);
                if (normalized && normalized !== mfr.name) {
                    await updateManufacturer(String(mfr.id), normalized);
                }
            }
        });
    };

    const handleUpdateCatName = async (cat: Category) => {
        setPromptDialog({
            title: '编辑分类 / Edit Category',
            message: '输入新名称 / Enter new name:',
            placeholder: cat.name,
            onSubmit: async (newName: string) => {
                if (newName && newName.trim() !== cat.name) {
                    await updateCategory({ id: cat.id, updates: { name: newName.trim() } });
                }
            }
        });
    };

    const handleAddTag = () => {
        setPromptDialog({
            title: '新增标签',
            message: '输入标签名称:',
            onSubmit: async (name: string) => {
                if (!name.trim()) return;
                const normalized = name.trim().toUpperCase();
                try {
                    await addTag(normalized);
                } catch (error: any) {
                    console.error('添加标签失败', error);
                }
            }
        });
    };

    return {
        handleAddManufacturer,
        handleUpdateTagName,
        handleUpdateMfrName,
        handleUpdateCatName,
        handleAddTag
    };
};
