
import { PhotoFormState } from '../types';

export function useFormValidation() {
  const validatePhotoForm = (form: Partial<PhotoFormState>, options: { isBatch?: boolean } = {}): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const { isBatch = false } = options;

    if (!isBatch) {
      if (!form.name || !form.name.trim()) {
        errors.push('產品名稱不能為空');
      }

      if (!form.categoryId || form.categoryId === 'uncategorized') {
        errors.push('請選擇一個分類');
      }
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
