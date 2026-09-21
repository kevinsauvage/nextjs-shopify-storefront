import type { ReactNode } from 'react';

import SectionTitle from '@/components/SectionTitle';
import { cn } from '@/utils/cn';

type HomeSectionProps = {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  titleClassName?: string;
  action?: ReactNode;
};

const HomeSection = ({
  title,
  eyebrow,
  children,
  className,
  titleClassName,
  action,
}: HomeSectionProps) => {
  return (
    <section className={cn('py-10 md:py-16', className)}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-10">
        <div>
          {eyebrow && <span className="text-eyebrow mb-3 block">{eyebrow}</span>}
          <SectionTitle className={titleClassName}>{title}</SectionTitle>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
};

export default HomeSection;
