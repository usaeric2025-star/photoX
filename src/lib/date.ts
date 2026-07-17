import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import 'dayjs/locale/zh-cn';

// 初始化插件
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

const DEFAULT_TIMEZONE = 'Asia/Kuala_Lumpur';

export function formatDate(date: Date | string | number | null | undefined, locale = 'zh'): string {
  if (!date) return '-';
  const d = dayjs(date);
  if (!d.isValid()) return '-';
  
  if (locale === 'zh') d.locale('zh-cn');
  return d.tz(DEFAULT_TIMEZONE).format('YYYY-MM-DD');
}

export function formatDateTime(date: Date | string | number | null | undefined, locale = 'zh'): string {
  if (!date) return '-';
  const d = dayjs(date);
  if (!d.isValid()) return '-';
  if (locale === 'zh') d.locale('zh-cn');
  return d.tz(DEFAULT_TIMEZONE).format('YYYY-MM-DD HH:mm');
}

export function formatTime(date: Date | string | number | null | undefined, locale = 'zh'): string {
  if (!date) return '-';
  const d = dayjs(date);
  if (!d.isValid()) return '-';
  if (locale === 'zh') d.locale('zh-cn');
  return d.tz(DEFAULT_TIMEZONE).format('HH:mm:ss');
}

export function timeAgo(date: Date | string | number | null | undefined, locale = 'zh'): string {
  if (!date) return '-';
  const d = dayjs(date);
  if (!d.isValid()) return '-';
  if (locale === 'zh') d.locale('zh-cn');
  return d.fromNow();
}
