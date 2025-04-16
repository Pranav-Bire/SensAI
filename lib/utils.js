import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

/**
 * Merge tailwind classes with clsx
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
