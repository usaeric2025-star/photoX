export const formatters = {
  // Date/Time
  date: (date: Date | string | number, locale: string = 'zh-TW') => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '-';
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Kuala_Lumpur'
      }).format(d);
    } catch {
      return '-';
    }
  },
  
  dateTime: (date: Date | string | number, locale: string = 'zh-TW') => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '-';
      return new Intl.DateTimeFormat(locale, {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kuala_Lumpur'
      }).format(d);
    } catch {
      return '-';
    }
  },

  time: (date: Date | string | number, locale: string = 'zh-TW') => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '-';
      return new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kuala_Lumpur'
      }).format(d);
    } catch {
      return '-';
    }
  },

  // File size
  fileSize: (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
};
