import { DiagnosticTest, registerDiagnostic } from './index';
import { PHOTO_LIST_FIELDS as PHOTO_SELECT_FIELDS } from '@/constants/photoFields';

const testConfig: DiagnosticTest = {
  id: 'select_field_coverage',
  name: 'Select Field Coverage Probe',
  description: '驗證 PHOTO_SELECT_FIELDS 是否覆蓋 UI 消費的所有關鍵字段',
  run: async () => {
    const startTime = performance.now();
    const fields = PHOTO_SELECT_FIELDS.split(',').map(f => f.trim());
    
    // UI 消費的關鍵字段清單（硬契約）
    const requiredUIFields = [
      'image_url',
      'thumb_url',
      'name',
      'item_code',
      'category_id'
    ];

    const missingFields = requiredUIFields.filter(f => !fields.includes(f));

    if (missingFields.length > 0) {
      return {
        passed: false,
        message: `缺失關鍵字段: ${missingFields.join(', ')}。組件渲染可能回退到低質原圖。`,
        durationMs: performance.now() - startTime
      };
    }

    return {
      passed: true,
      message: 'PHOTO_SELECT_FIELDS 完整性校驗通過',
      durationMs: performance.now() - startTime
    };
  }
};

registerDiagnostic(testConfig);
