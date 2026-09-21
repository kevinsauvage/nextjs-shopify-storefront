import Link from 'next/link';

import CardHeaderPattern from '@/components/CardHeaderPattern';
import PageBanner from '@/components/PageBanner';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

import { ChevronLeft, ShoppingCart } from 'lucide-react';

const Loading = () => {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
      <PageBanner title="Your Cart" className="w-full pb-4 md:pb-6">
        <div className="flex w-full items-center justify-between gap-4">
          <Link
            href="/collections"
            className="group flex items-center text-body-sm text-secondary transition-colors hover:text-primary"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Continue Shopping
          </Link>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-secondary" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      </PageBanner>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeaderPattern title="Cart Items" size={3} as="h2" />
            <CardContent>
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={`cart-item-${index + 1}`}>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="md:basis-1/2">
                        <ProductCardSkeleton variant="row" />
                      </div>
                      <div className="flex items-center justify-between gap-4 md:justify-end">
                        <Skeleton className="h-11 w-28 rounded-lg" />
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="size-11 rounded-full" />
                      </div>
                    </div>
                    {index < 2 ? <Separator className="my-6" /> : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeaderPattern title="Order Summary" size={4} />
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
              <Separator />
              <div className="flex items-baseline justify-between pt-2">
                <Skeleton className="h-6 w-14" />
                <Skeleton className="h-7 w-24" />
              </div>
            </CardContent>
            <CardFooter className="pt-6">
              <Skeleton className="h-11 w-full" />
            </CardFooter>
          </Card>

          <Card>
            <CardHeaderPattern
              className="pb-4 md:pb-6"
              title="Promo Code"
              size={4}
              description={<Skeleton className="h-4 w-full" />}
            />
            <CardContent>
              <Skeleton className="h-11 w-full" />
            </CardContent>
            <CardFooter className="pt-4 md:pt-6">
              <Skeleton className="h-5 w-32" />
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Loading;
