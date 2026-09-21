'use client';

import CardHeaderPattern from '@/components/CardHeaderPattern';
import CheckoutButton from '@/components/CheckoutButton';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import useCartContext from '@/contexts/CartContext/useCartContext';
import { formatPrice } from '@/utils/format';

const CartSummary = () => {
  const { cart } = useCartContext();

  if (!cart) return null;

  const subtotal = Number.parseFloat(cart.cost.subtotalAmount.amount);
  const total = Number.parseFloat(cart.cost.totalAmount.amount);
  const tax = Number.parseFloat(cart.cost.totalTaxAmount?.amount ?? '0');
  const discount = subtotal - total + tax;
  const hasDiscount = discount > 0;
  const {currencyCode} = cart.cost.subtotalAmount;

  return (
    <Card className="lg:sticky lg:top-4">
      <CardHeaderPattern className="pb-4" title="Order Summary" size={4} />
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center text-body-sm">
            <span className="text-secondary">Subtotal</span>
            <span className="text-body font-medium tabular-nums">{formatPrice(subtotal, currencyCode)}</span>
          </div>
          {hasDiscount && (
            <div className="flex justify-between items-center text-body-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <span className="text-secondary">Discount</span>
              <span className="text-body font-medium text-green-600 dark:text-green-400 tabular-nums">
                -{formatPrice(discount, currencyCode)}
              </span>
            </div>
          )}
          {tax > 0 && (
            <div className="flex justify-between items-center text-body-sm">
              <span className="text-secondary">Tax</span>
              <span className="text-body font-medium tabular-nums">{formatPrice(tax, currencyCode)}</span>
            </div>
          )}
        </div>
        <Separator />
        <div className="flex justify-between items-baseline pt-2">
          <span className="text-body-lg font-semibold">Total</span>
          <span className="text-heading-3 text-primary tabular-nums">{formatPrice(total, currencyCode)}</span>
        </div>
        {hasDiscount && (
          <div className="pt-2">
            <p className="text-caption-sm text-green-600 dark:text-green-400 text-center">
              You saved {formatPrice(discount, currencyCode)}!
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-6">
        <CheckoutButton checkoutUrl={String(cart.checkoutUrl)} />
      </CardFooter>
    </Card>
  );
};

export default CartSummary;
