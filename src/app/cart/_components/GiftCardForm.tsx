'use client';

import { useRef, useState } from 'react';

import FormFieldError from '@/components/FormFieldError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import useCartContext from '@/contexts/CartContext/useCartContext';

import { readStoredCodes, writeStoredCodes } from './giftCardStorage';

const GiftCardForm = () => {
  const { cart, updateGiftCardCodes } = useCartContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);
      const code = String(formData.get('giftCardCode') ?? '').trim();

      if (!code) {
        setError('Please enter a gift card code');
        return;
      }

      const cartId = cart?.id;
      const stored = readStoredCodes(cartId);

      if (stored.some((entry) => entry.toLowerCase() === code.toLowerCase())) {
        setError('This gift card is already applied');
        return;
      }

      // Replace semantics: Shopify sets the full list, so previously applied
      // codes must be re-sent. Codes applied on another device are unknown
      // here — adding a code replaces those (called out below the form).
      const codes = [...stored, code];

      await updateGiftCardCodes(codes);

      if (cartId) {
        writeStoredCodes(cartId, codes);
      }

      formRef.current?.reset();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to apply gift card');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" ref={formRef}>
      <div className="flex gap-2">
        <div className="flex-1 space-y-2">
          <Label htmlFor="giftCardCode" className="sr-only">
            Gift card code
          </Label>
          <Input
            type="text"
            id="giftCardCode"
            name="giftCardCode"
            placeholder="Enter gift card code"
            className="w-full"
            disabled={isLoading}
            autoComplete="off"
            aria-invalid={!!error?.at(-1)}
            aria-describedby={error?.at(-1) ? 'giftCardCode-error' : undefined}
          />
          <FormFieldError error={error ?? undefined} fieldId="giftCardCode" />
        </div>
        <Button type="submit" loading={isLoading} className="shrink-0">
          Apply
        </Button>
      </div>
      <p className="text-caption-sm text-secondary">
        Codes added here stack; adding one replaces cards applied on another device.
      </p>
    </form>
  );
};

export default GiftCardForm;
