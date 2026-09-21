import { cn } from '@/utils/cn';

/**
 * Skeleton placeholder.
 *
 * The pulse is slowed to ~2.4s with a calm `ease-in-out` curve (Tailwind's
 * default `animate-pulse` is a jittery 2s), and the reduced-motion guard in
 * `globals.css` collapses it for users who ask for less motion.
 */
const Skeleton = ({ className, ...properties }: React.ComponentProps<'div'>) => {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn('animate-skeleton rounded-md bg-muted', className)}
      {...properties}
    />
  );
};

export { Skeleton };
