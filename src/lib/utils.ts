import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// cn("p-4", condition && "text-red-500", "text-blue-500")
// → merges all class strings, resolving Tailwind conflicts
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
