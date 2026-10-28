import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type DisplayLocale = 'fr' | 'en' | 'ar';

function intlLocale(locale: DisplayLocale) {
  return locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-MA' : 'fr-FR';
}

export function formatMad(value: number, locale: DisplayLocale = 'fr') {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-MA' : 'fr-MA', {
    style: 'currency',
    currency: 'MAD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string | Date | number | null | undefined, locale: DisplayLocale = 'fr') {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: 'medium' }).format(new Date(value));
}

export function formatDateTime(value: string | Date | number | null | undefined, locale: DisplayLocale = 'fr') {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
