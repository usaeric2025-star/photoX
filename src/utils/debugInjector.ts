import { Photo } from '../types';

/**
 * 调试专用：主动注入脏数据
 * 用于测试 UI 在面对数据库异常、AI 识别失败或网络传输损坏时的健壮性
 */
export const injectBadData = (setPhotos: (updater: (prev: Photo[]) => Photo[]) => void) => {
  console.warn('⚠️ [DEBUG] Injecting corrupted data into state...');

  setPhotos(prev => {
    if (!prev || prev.length === 0) {
      console.error('No photos available to corrupt.');
      return prev;
    }

    const next = [...prev];

    // 1. 数组空洞测试：把第1个元素直接设为 null (测试 map/filter 是否报错)
    if (next.length > 0) {
      (next as any)[0] = null;
    }

    // 2. 核心字段丢失测试：把第2个元素的字段全删掉
    if (next.length > 1 && next[1]) {
      next[1] = { id: next[1].id } as Photo;
    }

    // 3. 类型错误测试：tagIds 应该是数组，我们注入字符串、null、undefined
    if (next.length > 2 && next[2]) {
      next[2] = {
        ...next[2],
        tagIds: "not_an_array" as any, // 常见 crash 点：tagIds.map is not a function
        name: null as any,
        description: undefined as any
      };
    }

    // 4. 嵌套对象错误测试：dimensions 设置为 null 或 非法对象
    if (next.length > 3 && next[3]) {
      next[3] = {
        ...next[3],
        dimensions: [null, { label: "corrupt" }, undefined] as any // 测试维度渲染逻辑
      };
    }

    // 5. 随机注入
    return next.map(p => {
      if (!p) return p;
      // 随机给一些照片注入 undefined 的描述翻译
      if (Math.random() > 0.8) {
        return {
          ...p,
          description_translations: null as any
        };
      }
      return p;
    });
  });

  console.log('✅ [DEBUG] Bad data injected. Inspecting UI for crashes...');
};
