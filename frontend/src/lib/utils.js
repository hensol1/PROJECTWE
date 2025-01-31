import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  if (typeof twMerge === 'function' && typeof clsx === 'function') {
    return twMerge(clsx(inputs));
  }
  // Fallback if tailwind-merge or clsx are not available
  return inputs.filter(Boolean).join(' ');
}