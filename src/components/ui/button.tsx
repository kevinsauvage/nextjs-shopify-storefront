import * as React from 'react';

import { cn } from '@/utils/cn';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:scale-[0.98] touch-manipulation",
  {
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
    variants: {
      size: {
        default: 'min-h-11 h-11 px-4 py-2 has-[>svg]:px-3',
        icon: 'min-h-11 min-w-11 size-11',
        lg: 'min-h-12 h-12 rounded-lg px-6 text-base has-[>svg]:px-4',
        sm: 'min-h-11 h-11 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5',
      },
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 active:bg-destructive/95 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        ghost:
          'hover:bg-accent hover:text-accent-foreground active:bg-accent/80 dark:hover:bg-accent/50 dark:active:bg-accent/40',
        link: 'text-foreground underline-offset-4 hover:underline focus-visible:ring-ring/50 focus-visible:ring-2',
        outline:
          'border border-border bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/80 dark:bg-input/30 dark:border-input dark:hover:bg-input/50 dark:active:bg-input/40',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/70 active:bg-secondary/60',
      },
    },
  },
);

export interface ButtonProps
  extends React.ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading, disabled, children, ...properties },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    const isDisabled = disabled || loading;

    const Spinner = loading ? (
      <svg
        className="animate-spin h-4 w-4 text-current"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    ) : null;

    return (
      <Comp
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ className, size, variant }))}
        disabled={isDisabled}
        aria-busy={loading}
        {...properties}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            {Spinner}
            {typeof children === 'string' ? (
              <span className="opacity-70">{children}</span>
            ) : (
              <span className="sr-only">Loading...</span>
            )}
          </span>
        ) : (
          children
        )}
      </Comp>
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
