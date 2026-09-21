'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';

import type { ProductFieldsFragment } from '@/shopify/storefront';
import { cn } from '@/utils/cn';

import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import SpinnerLoader from './SpinnerLoader';

import { Eye, ShoppingBag } from 'lucide-react';

// Only load QuickBuyContent when sheet is opened
const QuickBuyContent = dynamic(() => import('./QuickBuyContent'), {
  loading: () => (
    <div className="flex items-center justify-center h-full min-h-[50vh]">
      <SpinnerLoader />
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
          onClick={(event) => event.stopPropagation()}
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
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full gap-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Quick view</SheetTitle>
        </SheetHeader>
        {isOpen && <QuickBuyContent product={product} onClose={handleClose} />}
      </SheetContent>
    </Sheet>
  );
};

export default QuickBuy;
