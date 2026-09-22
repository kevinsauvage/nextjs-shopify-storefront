import type * as React from 'react';

import CardHeaderPattern from '@/components/CardHeaderPattern';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/cn';

import { ArrowRight, RotateCcw, ShieldCheck, Sparkles, Truck } from 'lucide-react';

type AuthShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

const benefits = [
  { Icon: Truck, text: 'Free shipping over $150' },
  { Icon: RotateCcw, text: '30-day easy returns' },
  { Icon: ShieldCheck, text: 'Secure member checkout' },
];

const AuthShell = ({ title, description, children, footer, className }: AuthShellProps) => {
  return (
    <div className={cn('hero-mesh min-h-[calc(100vh-76px)]', className)}>
      <div className="container mx-auto grid gap-8 px-4 py-10 md:px-6 md:py-14 lg:grid-cols-2 lg:items-center lg:gap-12">
        <div className="hidden lg:block">
          <span className="text-eyebrow-gold inline-flex items-center gap-2">
            <Sparkles size={14} aria-hidden="true" /> Members get more
          </span>
          <h1 className="text-heading-1 mt-4 max-w-md text-balance">
            A faster checkout, order tracking & 10% off your first order.
          </h1>
          <ul className="mt-8 space-y-3">
            {benefits.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-body-sm text-secondary">
                <span className="flex size-9 items-center justify-center rounded-full border border-border/70 bg-card text-[var(--gold)]">
                  <Icon size={16} aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <p className="mt-8 flex items-center gap-2 text-caption text-secondary">
            Join 12,000+ members <ArrowRight size={14} aria-hidden="true" />
          </p>
        </div>
        <div className="mx-auto w-full max-w-md">
          <Card className="border-border/60 bg-background/85 shadow-[0_28px_70px_-30px_rgb(12_10_9/0.4)] backdrop-blur supports-backdrop-filter:bg-background/80">
            <CardHeaderPattern
              className="pb-4"
              titleClassName="text-center w-full"
              descriptionClassName="text-center"
              title={title}
              description={description}
              size={3}
            />
            <CardContent className="space-y-6 pt-0">
              {children}
              {footer ? <div className="border-t pt-2">{footer}</div> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
