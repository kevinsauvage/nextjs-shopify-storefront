import { cn } from '@/utils/cn';

type PageBannerProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  children?: React.ReactNode;
  className?: string;
  /** "plain" keeps legacy centered text; "hero" adds warm mesh + card framing. */
  variant?: 'plain' | 'hero';
  align?: 'center' | 'left';
};

const PageBanner = ({
  title,
  description,
  eyebrow,
  children,
  className,
  variant = 'hero',
  align = 'center',
}: PageBannerProps) => {
  const centered = align === 'center';

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        variant === 'hero' && 'hero-mesh border-b border-border/60',
        className,
      )}
    >
      {variant === 'hero' && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-[8%] size-72 rounded-full bg-[var(--gold-soft)] blur-3xl opacity-80" />
          <div className="absolute -right-20 top-10 size-80 rounded-full bg-[var(--gold)]/10 blur-3xl" />
        </div>
      )}
      <div
        className={cn(
          'container relative mx-auto flex flex-col px-4 md:px-6',
          variant === 'hero' ? 'py-14 md:py-20' : 'py-10 md:py-14',
          centered ? 'items-center justify-center text-center' : 'items-start justify-center text-left',
        )}
      >
        {eyebrow && (
          <span
            className={cn(
              'mb-4 inline-flex items-center gap-3',
              centered && 'justify-center',
              'text-eyebrow-gold',
            )}
          >
            <span aria-hidden="true" className="h-px w-8 bg-[var(--gold)]/60" />
            {eyebrow}
            <span aria-hidden="true" className="h-px w-8 bg-[var(--gold)]/60" />
          </span>
        )}
        <h1 className="max-w-3xl text-balance">{title}</h1>
        {description && (
          <p
            className={cn(
              'text-body-lg mt-5 max-w-2xl text-secondary',
              centered && 'mx-auto',
            )}
          >
            {description}
          </p>
        )}
        {children && (
          <div className={cn('mt-8 flex w-full flex-col gap-6', centered && 'items-center')}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageBanner;
