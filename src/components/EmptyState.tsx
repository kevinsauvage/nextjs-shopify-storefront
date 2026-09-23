import Image from 'next/image';

import NotFoundIllustration from '@/assets/NotFoundIllustration.png';

type EmptyStateProps = {
  /** Primary CTA button (required) */
  primaryAction?: React.ReactNode;
  /** Optional secondary link/action */
  secondaryAction?: React.ReactNode;
  /** Image to display */
  image?: {
    src: string;
    width: number;
    height: number;
  };
  /** Clear title */
  title: string;
  /** 1-2 sentence guidance (text-body-sm/text-body) */
  subtitle: string;
  /** Alt text for image */
  altText: string;
  /** Tips list - only shown for error variant */
  tips?: string[];
  /** Variant type */
  variant?: 'default' | 'cart' | 'search' | 'wishlist' | 'orders' | 'addresses' | 'error';
};

/**
 * Server-rendered empty/error state. The entrance animation is pure CSS
 * (`.animate-rise` in `globals.css`) so the content is visible on first paint
 * instead of waiting for hydration.
 */
const EmptyState = ({
  primaryAction,
  secondaryAction,
  image = NotFoundIllustration,
  title,
  subtitle,
  altText,
  tips,
  variant = 'default',
}: EmptyStateProps) => {
  // Tips only shown for error variant
  const shouldShowTips = variant === 'error' && tips && tips.length > 0;

  return (
    <div className="animate-rise flex flex-col items-center justify-center h-full">
      <div className="animate-rise animate-rise-1 relative mb-6">
        <Image
          className="object-contain animate-pulse-subtle"
          alt={altText}
          src={image.src}
          width={image.width}
          height={image.height}
          style={{ maxHeight: '200px', width: 'auto', height: 'auto' }}
        />
      </div>
      <div className="animate-rise animate-rise-2 text-center">
        <h2 className="text-heading-3 mb-2 px-4">{title}</h2>
        <p className="max-w-xl mx-auto px-4 text-center text-body-sm md:text-body text-secondary mb-6">
          {subtitle}
        </p>

        {shouldShowTips && (
          <div className="mb-6 max-w-xl mx-auto px-4">
            <p className="text-label-sm text-secondary mb-3 font-medium">Helpful tips:</p>
            <ul className="space-y-2 text-left">
              {tips.map((tip, index) => (
                <li
                  key={tip || `tip-${index}`}
                  className="animate-rise flex items-start gap-2 text-body-sm text-secondary"
                  style={{ animationDelay: `${300 + index * 100}ms` }}
                >
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(primaryAction || secondaryAction) && (
          <div className="animate-rise animate-rise-3 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto px-4">
            {primaryAction && (
              <div className="w-full sm:w-auto [&>a]:w-full sm:[&>a]:w-auto [&>button]:w-full sm:[&>button]:w-auto">
                {primaryAction}
              </div>
            )}
            {secondaryAction && (
              <div className="text-body-sm text-center w-full sm:w-auto">{secondaryAction}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
