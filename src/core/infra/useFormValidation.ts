
import { ProductFormData } from '@/types';

export function useFormValidation() {
  const validatePhotoForm = (form: Partial<ProductFormData>, options: { isBatch?: boolean } = {}): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const { isBatch = false } = options;

    if (!isBatch) {
      // Product name is now optional to prevent blocking normal updates/saves
      // if (!form.name || !form.name.trim()) {
      //   errors.push('产品名称不能为空');
      // }

      // Category is now optional to reduce friction
      // if (!form.categoryId || form.categoryId === 'uncategorized') {
      //   errors.push('请选择一个分类');
      // }
    }

    // Optional: Model number validation could go here
    // if (form.model_number && !/^[A-Z0-9-]+$/.test(form.model_number)) {
    //   errors.push('型號格式無效');
    // }

    return {
      valid: errors.length === 0,
      errors
    };
  };

  return { validatePhotoForm };
}
