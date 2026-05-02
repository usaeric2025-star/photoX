
import { format } from 'date-fns';

/**
 * Standard date formatting for the application: YYYY-MM-DD HH:mm
 */
export function formatDate(date: Date | string | number): string {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return format(d, 'yyyy-MM-dd HH:mm');
  } catch (e) {
    return '-';
  }
}
