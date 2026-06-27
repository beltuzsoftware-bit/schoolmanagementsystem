import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCurrencySymbol(currency: string | undefined | null) {
  if (!currency) return '₹'; // Default for the system's target market

  const c = currency.toUpperCase();
  if (c === 'INR') return '₹';
  if (c === 'USD') return '$';
  if (c === 'GBP') return '£';
  if (c === 'EUR') return '€';

  // If it's already a symbol or unknown code, return as is
  return currency;
}
