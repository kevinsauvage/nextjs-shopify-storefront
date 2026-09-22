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

import { ChevronLeft, Lock, RotateCcw, Truck } from 'lucide-react';

const FREE_SHIPPING_THRESHOLD = 150;

const FreeShippingBar = ({ subtotal }: { subtotal: number }) => {
  const progress = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  return (
    <div className="rounded-[var(--radius)] border border-border/70 bg-card p-4 md:p-5">
      <p className="flex items-center gap-2 text-body-sm font-medium">
        <Truck size={16} className="text-[var(--gold)]" aria-hidden="true" />
        {remaining > 0 ? (
          <span>
            You&apos;re <strong>${remaining.toFixed(0)}</strong> away from free shipping
          </span>
        ) : (
          <span>You&apos;ve unlocked complimentary shipping</span>
        )}
      </p>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progress to free shipping"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--gold-strong)] to-[var(--gold)] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

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
      {/* The empty state carries its own heading, so the banner would only
          repeat it — skip it and let the empty state be the page content. */}
      {!isEmpty && (
        <PageBanner
          title="Your Cart"
          eyebrow="Secure checkout"
          description="Review your pieces — taxes and shipping are calculated at checkout."
          className="w-full rounded-[var(--radius)]"
        >
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
        </PageBanner>
      )}

      {isEmpty ? (
        <CartEmptyState />
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          <div className="space-y-6 lg:col-span-2">
            <FreeShippingBar
              subtotal={Number.parseFloat(cart?.cost?.subtotalAmount?.amount ?? '0')}
            />
            <CartItemsList />
          </div>

          <div className="space-y-6 lg:col-span-1">
            <CartSummary />
            <CartPromoCode />
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-caption text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <Lock size={13} aria-hidden="true" /> Secure checkout
              </span>
              <span className="inline-flex items-center gap-1.5">
                <RotateCcw size={13} aria-hidden="true" /> 30-day returns
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Truck size={13} aria-hidden="true" /> Insured delivery
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartView;
