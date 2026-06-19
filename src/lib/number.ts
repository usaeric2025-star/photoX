export function formatPrice(amount: number, currency = 'RM'): string {
  try {
    return `${currency}${amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;
  } catch {
    return `${currency}${amount}`;
  }
}

export function formatNumber(num: number, locale = 'en-MY'): string {
  try {
    return num.toLocaleString(locale);
  } catch {
    return String(num);
  }
}

export function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return value;
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}
