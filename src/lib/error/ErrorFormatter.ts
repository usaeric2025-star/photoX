import * as v from 'valibot';
import { translations, TranslationType } from '#src/locales/index.js';

export class ErrorFormatter {
  static get t(): TranslationType {
    const lang = (typeof document !== 'undefined' && document.documentElement?.dataset?.lang) as keyof typeof translations || 'en';
    return translations[lang] || translations.en;
  }

  static mapResourceToLocalized(resource: string): string {
    const t = this.t;
    const map: Record<string, string> = {
      photo: t.furniture,
      Photo: t.furniture,
      photos: t.galleryName,
      Photos: t.galleryName,
      category: t.category,
      Category: t.category,
      tag: t.tags,
      Tag: t.tags,
      group: t.furniture,
      Group: t.furniture,
      user: t.login,
      User: t.login,
    };
    return map[resource] ?? resource;
  }

  static formatValibotError(error: v.ValiError<v.GenericSchema>): string {
    return error.issues.map((issue) => {
      const path = issue.path?.map((p) => String((p as unknown as Record<string, unknown>).key)).join('.') || '参数';
      return `${path} ${issue.message}`;
    }).join('，');
  }

  static extractErrorMessage(error: unknown): string {
    if (!error) return '未知错误';
    
    let rawMsg = '';
    
    if (typeof error === 'string') {
      rawMsg = error;
    } else if (error && typeof error === 'object') {
      const errObj = error as Record<string, unknown>;
      
      if (errObj.error && typeof errObj.error === 'string') {
        rawMsg = errObj.error;
      } else if (errObj.message && typeof errObj.message === 'string') {
        rawMsg = errObj.message;
      } else {
        const nestedError = errObj.error as Record<string, unknown> | undefined;
        if (nestedError?.message) {
          rawMsg = String(nestedError.message);
        } else {
          const respData = (errObj.response as Record<string, unknown> | undefined)?.data as Record<string, unknown> | undefined;
          if (respData) {
            if (respData.message) {
              rawMsg = String(respData.message);
            } else {
              const respNestedError = respData.error as Record<string, unknown> | undefined;
              if (respNestedError?.message) {
                rawMsg = String(respNestedError.message);
              }
            }
          }
        }
      }
    }

    if (!rawMsg && error instanceof Error) {
      rawMsg = error.message;
    }

    if (!rawMsg) {
      rawMsg = String(error || '未知错误');
    }

    if (rawMsg.trim() === '' || rawMsg === '[object Object]') {
      rawMsg = '未知系統錯誤 (未提供詳細訊息)';
    }

    const lowerMsg = rawMsg.toLowerCase();
    
    if (lowerMsg.includes('failed to fetch') || lowerMsg.includes('network request failed')) {
      return '网络连接异常';
    }
    if (lowerMsg.includes('network error')) {
      return '网络错误';
    }
    if (lowerMsg.includes('timeout') || lowerMsg.includes('timed out')) {
      return '请求超时';
    }
    if (lowerMsg.includes('unauthorized') || lowerMsg.includes('token expired') || lowerMsg.includes('invalid token')) {
      return '登录过期';
    }
    if (lowerMsg.includes('permission denied') || lowerMsg.includes('forbidden')) {
      return '权限不足';
    }
    if (lowerMsg.includes('not found')) {
      return '资源不存在';
    }
    if (lowerMsg.includes('conflict') || lowerMsg.includes('already exists')) {
      return '数据已存在';
    }
    if (lowerMsg.includes('validation') || lowerMsg.includes('invalid argument') || lowerMsg.includes('bad request')) {
      return `输入格式错误: ${rawMsg}`;
    }

    if (rawMsg === 'Network Error') return '网络错误';
    if (rawMsg === 'Unknown Error') return '未知系统错误';

    return rawMsg;
  }
}
