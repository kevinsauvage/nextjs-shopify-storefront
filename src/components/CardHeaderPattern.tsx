import type * as React from 'react';

import { CardHeader } from '@/components/ui/card';
import { cn } from '@/utils/cn';

type CardHeaderPatternProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /**
   * Card header titles should generally be `h3` (per design doc).
   * Use `h2` only when the card is the primary section heading on a page.
   */
  as?: 'h2' | 'h3';
  size?: 3 | 4;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
};

const sizeToTitleClass: Record<NonNullable<CardHeaderPatternProps['size']>, string> = {
  3: 'text-heading-3',
  4: 'text-heading-4',
};

const CardHeaderPattern = ({
  title,
  description,
  actions,
  as = 'h3',
  size = 3,
  className,
  titleClassName,
  descriptionClassName,
}: CardHeaderPatternProps) => {
  const HeadingTag = as;

  return (
    <CardHeader className={cn('space-y-2', className)}>
      <div className="flex items-start justify-between gap-4">
        <HeadingTag className={cn(sizeToTitleClass[size], 'mb-0', titleClassName)}>
          {title}
        </HeadingTag>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      {description ? (
        <div className={cn('text-body-sm text-secondary', descriptionClassName)}>{description}</div>
      ) : null}
    </CardHeader>
  );
};

export default CardHeaderPattern;
