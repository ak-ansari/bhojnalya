import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/** Joins class names and lets a later Tailwind utility override an earlier one (shadcn/ui). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// The preset's named font sizes and radii must be known here, or `text-body`
// would be read as a colour and silently drop `text-white` beside it.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['caption', 'body-sm', 'body', 'title', 'display'] }],
      rounded: [{ rounded: ['chip', 'control', 'card', 'dialog'] }],
    },
  },
});
