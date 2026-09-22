'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';

import type { ProductFieldsFragment } from '@/shopify/storefront';
import { cn } from '@/utils/cn';

import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Skeleton } from './ui/skeleton';

import { Eye, ShoppingBag } from 'lucide-react';

// Only load QuickBuyContent when sheet is opened
const QuickBuyContent = dynamic(() => import('./QuickBuyContent'), {
  loading: () => (
    <div className="flex flex-col">
      <Skeleton className="aspect-[3/4] w-full rounded-none bg-muted" />
      <div className="space-y-4 p-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-5 w-1/3" />
        <div className="space-y-2 pt-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    </div>
  ),
});

type QuickBuyProps = {
  product: ProductFieldsFragment;
  /** When provided, renders a labelled pill button instead of the icon-only variant. */
  triggerLabel?: string;
  triggerClassName?: string;
};

const QuickBuy = ({ product, triggerLabel, triggerClassName }: QuickBuyProps) => {
  const [isOpen, setIsOpen] = useState(false);
  // A product grid can hold dozens of cards; mounting a Radix dialog for each
  // one is the bulk of the per-card client cost. Mount the sheet only after the
  // visitor shows intent (hover/focus/tap), while the trigger stays cheap.
  const [isReady, setIsReady] = useState(false);

  const activate = useCallback(() => setIsReady(true), []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant={triggerLabel ? 'secondary' : 'ghost'}
          className={cn(
            triggerLabel
              ? 'h-11 gap-2 rounded-full border border-border/50 bg-background/90 px-4 text-caption font-semibold text-foreground shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-background'
              : 'flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border bg-background/95 text-secondary shadow-md backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-muted',
            triggerClassName,
          )}
          type="button"
          aria-label={triggerLabel ? `Quick add ${product.title}` : 'Quick view'}
          onFocus={activate}
          onPointerEnter={activate}
          onClick={(event) => {
            activate();
            event.stopPropagation();
          }}
        >
          {triggerLabel ? (
            <>
              <ShoppingBag className="h-4 w-4" />
              {triggerLabel}
            </>
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button>
      </SheetTrigger>
      {isReady && (
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full gap-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Quick view</SheetTitle>
          </SheetHeader>
          {isOpen && <QuickBuyContent product={product} onClose={handleClose} />}
        </SheetContent>
      )}
    </Sheet>
  );
};

export default QuickBuy;
