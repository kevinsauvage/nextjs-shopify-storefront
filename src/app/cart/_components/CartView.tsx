'use client';

import Link from 'next/link';

import CartLoading from '@/app/cart/loading';
import EmptyState from '@/components/EmptyState';
import PageBanner from '@/components/PageBanner';
import { Button } from '@/components/ui/button';
import useCartContext from '@/contexts/CartContext/useCartContext';

import CartEmptyState from './CartEmptyState';
import CartHeader from './CartHeader';
import CartItemsList from './CartItemsList';
import CartPromoCode from './CartPromoCode';
import CartSummary from './CartSummary';

import { ChevronLeft } from 'lucide-react';

/**
 * Cart page body. The cart is owned by `CartProvider`, so the page renders from
 * context instead of fetching the cart a second time on the server. While the
 * cart is resolving client-side it reuses the route's `loading.tsx` skeleton,
 * so there is a single cart skeleton to maintain.
 */
const CartView = () => {
  const { cart, error, isLoading } = useCartContext();
  const isEmpty = !cart?.lines?.edges?.length;

  if (isLoading) {
    return <CartLoading />;
  }

  // A load failure leaves `cart` null; without this the UI would wrongly claim
  // the cart is empty. Surface the outage and offer a retry instead.
  if (error && !cart) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <EmptyState
          variant="error"
          altText="Error illustration"
          title="We couldn't load your cart"
          subtitle="Something went wrong while retrieving your cart. Please try again."
          tips={['Check your connection', 'Refresh the page']}
          primaryAction={
            <Button onClick={() => window.location.reload()} variant="default">
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
      <PageBanner title="Your Cart" className="w-full pb-4 md:pb-6">
        {!isEmpty && (
          <div className="flex w-full flex-wrap items-center justify-between gap-4">
            <Link
              href="/collections"
              className="group flex items-center text-body-sm text-secondary transition-colors hover:text-primary"
            >
              <ChevronLeft className="mr-1 h-4 w-4 text-secondary transition-colors group-hover:text-primary" />
              Continue Shopping
            </Link>
            <CartHeader />
          </div>
        )}
      </PageBanner>

      {isEmpty ? (
        <CartEmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          <div className="lg:col-span-2">
            <CartItemsList />
          </div>

          <div className="space-y-6 lg:col-span-1">
            <CartSummary />
            <CartPromoCode />
          </div>
        </div>
      )}
    </div>
  );
};

export default CartView;
