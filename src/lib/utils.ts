import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
  }).format(new Date(date));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
  }).format(amount);
}

export function formatPhoneNumber(value: string) {
  // Remove all non-numeric characters
  const cleaned = value.replace(/\D/g, "");
  
  // Apply the 03XX-XXXXXXX mask
  if (cleaned.length <= 4) return cleaned;
  if (cleaned.length <= 11) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  }
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 11)}`;
}

export function isValidPhoneNumber(value: string) {
  // Regex for 03XX-XXXXXXX
  const regex = /^03\d{2}-\d{7}$/;
  return regex.test(value);
}
