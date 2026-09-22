import { cn } from '@/utils/cn';

type SectionTitleProps = {
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3';
};

const SectionTitle = ({ children, className, as = 'h2' }: SectionTitleProps) => {
  const HeadingTag = as;
  return <HeadingTag className={cn('text-heading-2', className)}>{children}</HeadingTag>;
};

export default SectionTitle;
