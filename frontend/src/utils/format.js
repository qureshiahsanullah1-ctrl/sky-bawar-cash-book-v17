import { API_BASE } from '../services/api.js';

export const currency = (value, code = 'AFN') => {
  const number = Number(value || 0);
  const label = code === 'USD' ? 'USD' : 'AFN';
  const formatted = Math.abs(number).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${number < 0 ? '-' : ''}${label} ${formatted}`;
};

export const signedCurrency = (value, type = 'cash_in', code = 'AFN') => {
  const number = Math.abs(Number(value || 0));
  const sign = type === 'cash_out' ? '-' : '+';
  const label = code === 'USD' ? 'USD' : 'AFN';
  const formatted = number.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${sign}${label} ${formatted}`;
};

export const currencyTone = (value) => {
  const number = Number(value || 0);
  if (number > 0) return 'success';
  if (number < 0) return 'danger';
  return 'neutral';
};

export const todayInputValue = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

export const AFGHAN_PERSIAN_MONTHS = [
  'حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله',
  'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت'
];

export const toPersianDigits = (str) => {
  const persianNums = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(str ?? '').replace(/[0-9]/g, (w) => persianNums[+w]);
};

export const dateLabel = (value) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(`${value.split('T')[0]}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const jalaliDateLabel = (value, { persianDigits = false } = {}) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(`${value.split('T')[0]}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const locale = persianDigits ? 'fa-AF-u-ca-persian' : 'fa-AF-u-ca-persian-nu-latn';
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
    return `${values.year}/${values.month}/${values.day}`;
  } catch {
    return '';
  }
};

export const jalaliFullDateLabel = (value, { persianDigits = false } = {}) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(`${value.split('T')[0]}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  try {
    const locale = persianDigits ? 'fa-AF-u-ca-persian' : 'fa-AF-u-ca-persian-nu-latn';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  } catch {
    return jalaliDateLabel(value, { persianDigits });
  }
};

export const jalaliPeriodLabel = (periodStr, { persianDigits = false } = {}) => {
  if (!periodStr) return '';
  try {
    const [y, m] = String(periodStr).split('-');
    if (!y || !m) return periodStr;
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 15);
    const locale = persianDigits ? 'fa-AF-u-ca-persian' : 'fa-AF-u-ca-persian-nu-latn';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long'
    }).format(date);
  } catch {
    return periodStr;
  }
};

export const dualDateLabel = (value) => {
  if (!value) return { gregorian: '', jalali: '', jalaliFull: '', jalaliFa: '', jalaliFullFa: '' };
  return {
    gregorian: dateLabel(value),
    jalali: jalaliDateLabel(value),
    jalaliFull: jalaliFullDateLabel(value),
    jalaliFa: jalaliDateLabel(value, { persianDigits: true }),
    jalaliFullFa: jalaliFullDateLabel(value, { persianDigits: true })
  };
};

export const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const isRTLText = (text = '') => /[\u0591-\u08FF]/.test(text);

export const compactTransactionNo = (value = '') => {
  const text = String(value);
  return text.replace(/^TX-(\d{2})(\d{6})-(\d+)$/i, 'TX-$2-$3');
};

export const resolveAvatarUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  if (cleanPath.startsWith('/uploads/')) {
    if (API_BASE && API_BASE.startsWith('http')) {
      const base = API_BASE.replace(/\/api$/, '').replace(/\/+$/, '');
      return `${base}${cleanPath}`;
    }
    return `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'}${cleanPath}`;
  }
  return `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'}${cleanPath}`;
};
