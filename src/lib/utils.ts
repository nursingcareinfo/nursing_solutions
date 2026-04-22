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
