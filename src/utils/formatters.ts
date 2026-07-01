import { formatDate, formatDateTime, formatTime, timeAgo } from '#lib/date';

export const formatters = {
  // Date/Time
  date: (date: Date | string | number | null | undefined) => formatDate(date),
  
  dateTime: (date: Date | string | number | null | undefined) => formatDateTime(date),

  time: (date: Date | string | number | null | undefined) => formatTime(date),

  relative: (date: Date | string | number | null | undefined) => timeAgo(date),

  // File size
  fileSize: (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
};
