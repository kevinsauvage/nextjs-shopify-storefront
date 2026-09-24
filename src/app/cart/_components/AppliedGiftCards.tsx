'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import useCartContext from '@/contexts/CartContext/useCartContext';
import { reportError } from '@/lib/logger';

import { pruneStoredCode } from './giftCardStorage';

import { X } from 'lucide-react';

const AppliedGiftCards = () => {
  const { cart, removeGiftCardCode } = useCartContext();
  const appliedGiftCards = cart?.appliedGiftCards ?? [];

  if (appliedGiftCards.length === 0) {
    return null;
  }

  const handleRemove = async (appliedGiftCardId: string) => {
    const removed = appliedGiftCards.find((giftCard) => giftCard.id === appliedGiftCardId);

    try {
      await removeGiftCardCode(appliedGiftCardId);
      pruneStoredCode(cart?.id, removed?.lastCharacters);
    } catch (error) {
      reportError('cart/gift-card-remove', error);
    }
  };

  return (
    <div className="flex flex-col gap-1 mt-2 space-y-4">
      <div>
        <span className="block mb-2 text-body-sm text-secondary">Applied gift cards:</span>
        <div className="flex flex-wrap gap-2">
          {appliedGiftCards.map((giftCard) => (
            <div key={giftCard.id}>
              <Badge variant="secondary" className="py-0 pr-0">
                •••• {giftCard.lastCharacters}
                <Button
                  onClick={() => {
                    handleRemove(giftCard.id).catch((error) => {
                      reportError('cart/gift-card-remove', error);
                    });
                  }}
                  className="cursor-pointer"
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove gift card ending in ${giftCard.lastCharacters}`}
                >
                  <X size={14} />
                </Button>
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AppliedGiftCards;
