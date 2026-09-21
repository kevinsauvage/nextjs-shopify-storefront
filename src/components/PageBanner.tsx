import { cn } from '@/utils/cn';

type PageBannerProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  children?: React.ReactNode;
  className?: string;
};

const PageBanner = ({ title, description, eyebrow, children, className }: PageBannerProps) => (
  <div
    className={cn(
      'container mx-auto flex flex-col items-center justify-center px-4 py-14 text-center md:px-6 md:py-20',
      className,
    )}
  >
    {eyebrow && <span className="text-eyebrow mb-4">{eyebrow}</span>}
    <h1 className="text-balance">{title}</h1>
    {description && (
      <p className="text-body-lg mx-auto mt-5 max-w-2xl text-secondary">{description}</p>
    )}
    {children && <div className="mt-8 flex w-full flex-col items-center gap-6">{children}</div>}
  </div>
);

export default PageBanner;
