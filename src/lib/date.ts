const TIME_ZONE = 'Asia/Kuala_Lumpur';

function getLocaleCode(locale: string) {
  return locale === 'zh' ? 'zh-CN' : 'en-US';
}

export function formatDate(date: Date | string, locale = 'zh'): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    const parts = new Intl.DateTimeFormat(getLocaleCode(locale), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: TIME_ZONE
    }).formatToParts(d);
    const map = new Map(parts.map(p => [p.type, p.value]));
    return `${map.get('year')}-${map.get('month')}-${map.get('day')}`;
  } catch {
    return '-';
  }
}

export function formatDateTime(date: Date | string, locale = 'zh'): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    const parts = new Intl.DateTimeFormat(getLocaleCode(locale), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: TIME_ZONE
    }).formatToParts(d);
    const map = new Map(parts.map(p => [p.type, p.value]));
    return `${map.get('year')}-${map.get('month')}-${map.get('day')} ${map.get('hour')}:${map.get('minute')}`;
  } catch {
    return '-';
  }
}

export function timeAgo(date: Date | string, locale = 'zh'): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((d.getTime() - now.getTime()) / 1000);
    
    // RelativeTimeFormat handles the "ago" part
    const rtf = new Intl.RelativeTimeFormat(getLocaleCode(locale), { numeric: 'auto' });
    
    const absDiff = Math.abs(diffInSeconds);
    if (absDiff < 60) return locale === 'zh' ? '刚刚' : 'just now';
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (Math.abs(diffInMinutes) < 60) return rtf.format(diffInMinutes, 'minute');
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (Math.abs(diffInHours) < 24) return rtf.format(diffInHours, 'hour');
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (Math.abs(diffInDays) < 30) return rtf.format(diffInDays, 'day');
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (Math.abs(diffInMonths) < 12) return rtf.format(diffInMonths, 'month');
    
    return rtf.format(Math.floor(diffInMonths / 12), 'year');
  } catch {
    return '-';
  }
}
