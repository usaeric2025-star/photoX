import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export const formatDate = (date: string | Date) => dayjs(date).format('YYYY-MM-DD');
export const formatDateTime = (date: string | Date) => dayjs(date).format('YYYY-MM-DD HH:mm');
export const formatRelative = (date: string | Date) => dayjs(date).fromNow();
