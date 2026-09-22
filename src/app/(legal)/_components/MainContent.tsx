import { cn } from '@/utils/cn';

const MainContent = ({
  children,
  className,
  ...properties
}: {
  children: React.ReactNode;
  className?: string;
} & React.HTMLProps<HTMLDivElement> & { [key: string]: unknown }) => {
  return (
    <div
      className={cn('mx-auto mb-12 flex max-w-6xl flex-col space-y-12', className)}
      {...properties}
    >
      <div className="container mx-auto px-4 md:px-6">
        <article className="product-description mx-auto max-w-3xl rounded-[var(--radius)] border border-border/70 bg-card p-6 text-body leading-relaxed text-secondary md:p-10 [&_h2]:text-heading-3 [&_h2]:text-foreground [&_h3]:text-heading-4 [&_h3]:text-foreground [&_a]:link [&_strong]:text-foreground">
          {children}
        </article>
      </div>
    </div>
  );
};

export default MainContent;
