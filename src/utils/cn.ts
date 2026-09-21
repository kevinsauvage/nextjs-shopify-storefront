import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Custom typography utilities declared in `globals.css`.
 *
 * `tailwind-merge` cannot know about these from the Tailwind config, so by
 * default it treats `text-body-lg` & friends as text *colors*. That makes it
 * drop a real color utility (e.g. `text-primary-foreground`) whenever both are
 * merged, leaving buttons with invisible text. Registering them as font sizes
 * keeps the two groups independent.
 */
const CUSTOM_FONT_SIZE_CLASSES = [
  'display',
  'heading-1',
  'heading-2',
  'heading-3',
  'heading-4',
  'body-lg',
  'body',
  'body-sm',
  'caption',
  'caption-sm',
  'label',
  'label-sm',
  'eyebrow',
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: CUSTOM_FONT_SIZE_CLASSES }],
    },
  },
});

/**
 * Utility function to merge class names
 * Combines clsx and tailwind-merge for optimal class name handling
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
