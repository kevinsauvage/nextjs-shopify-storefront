'use client';

import CardHeaderPattern from '@/components/CardHeaderPattern';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import AppliedGiftCards from './AppliedGiftCards';
import CouponCodeForm from './CouponCodeForm';
import DiscountCodes from './DiscountCodes';
import GiftCardForm from './GiftCardForm';

import { Tag } from 'lucide-react';

const CartPromoCode = () => {
  return (
    <Card>
      <CardHeaderPattern
        className="pb-4 md:pb-6"
        size={4}
        title={
          <span className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-secondary" />
            Promo Code
          </span>
        }
        description="Enter a promo code to apply a discount to your order."
      />
      <CardContent>
        <CouponCodeForm />
      </CardContent>
      <CardFooter className="pt-4 md:pt-6">
        <DiscountCodes />
      </CardFooter>
      <CardContent className="space-y-4">
        <Separator />
        <div className="space-y-2">
          <h3 className="text-body font-medium">Gift cards</h3>
          <p className="text-body-sm text-secondary">
            Have a gift card? Apply it here — it stacks with promo codes.
          </p>
          <GiftCardForm />
          <AppliedGiftCards />
        </div>
      </CardContent>
    </Card>
  );
};

export default CartPromoCode;
