
/**
 * Standard date formatting for the application: YYYY-MM-DD HH:mm
 */
export function formatDate(date: Date | string | number): string {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  } catch (e) {
    return '-';
  }
}
