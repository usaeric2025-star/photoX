export const formatDate = (date: string | Date, format: 'short' | 'long' | 'relative' = 'short') => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  switch (format) {
    case 'short':
      return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
    case 'long':
      return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    case 'relative':
      const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 0) return '今天';
      if (diff === 1) return '昨天';
      if (diff < 7) return `${diff}天前`;
      return formatDate(date, 'short');
  }
};
