import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn's class-merge helper: resolves conditional classes (clsx) and dedupes
// conflicting Tailwind utilities (tailwind-merge).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
