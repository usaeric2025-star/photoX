import { formatDistanceToNow, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { zhCN, enUS } from 'date-fns/locale';

const TIME_ZONE = 'Asia/Kuala_Lumpur';

export function formatDate(date: Date | string, locale = 'zh'): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return formatInTimeZone(d, TIME_ZONE, 'yyyy-MM-dd', { locale: locale === 'zh' ? zhCN : enUS });
  } catch {
    return '-';
  }
}

export function formatDateTime(date: Date | string, locale = 'zh'): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return formatInTimeZone(d, TIME_ZONE, 'yyyy-MM-dd HH:mm', { locale: locale === 'zh' ? zhCN : enUS });
  } catch {
    return '-';
  }
}

export function timeAgo(date: Date | string, locale = 'zh'): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    // formatDistanceToNow uses current time, so we should convert to timezone first if needed
    // However, it's easier to just use the system's current time for relative distance calculation.
    return formatDistanceToNow(d, { addSuffix: true, locale: locale === 'zh' ? zhCN : enUS });
  } catch {
    return '-';
  }
}
