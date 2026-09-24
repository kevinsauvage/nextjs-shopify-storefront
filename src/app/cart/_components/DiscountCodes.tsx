'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import useCartContext from '@/contexts/CartContext/useCartContext';
import { reportError } from '@/lib/logger';

import { X } from 'lucide-react';

const DiscountCodes = () => {
  const { cart, updateDiscountCodes } = useCartContext();
  const discountCodes = cart?.discountCodes ?? [];

  const handleRemoveCode = async (code: string) => {
    const newCoupons = discountCodes
      .filter((discountCode) => discountCode.code !== code)
      .map((discountCode) => discountCode.code);

    await updateDiscountCodes(newCoupons);
  };

  if (discountCodes.length === 0) {
    return null;
  }

  const applicableCodes = discountCodes.filter((code) => code.applicable);
  const notApplicableCodes = discountCodes.filter((code) => !code.applicable);

  return (
    <div className="flex flex-col gap-1 mt-2 space-y-4">
      {applicableCodes.length > 0 && (
        <div>
          <span className="block mb-2 text-body-sm text-secondary"> Applied: </span>
          <div className="flex flex-wrap gap-2">
            {applicableCodes.map((code) => {
              return (
                <div key={code.code}>
                  <Badge variant="secondary" className="py-0 pr-0">
                    {code.code}
                    <Button
                      onClick={() => {
                        handleRemoveCode(code.code).catch((error) => {
                          reportError('cart/discount', error);
                        });
                      }}
                      className="cursor-pointer"
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove discount code ${code.code}`}
                    >
                      <X size={14} />
                    </Button>
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {notApplicableCodes.length > 0 && (
        <div>
          <span className="block mb-2 text-body-sm text-secondary"> Not Applicable: </span>
          <div className="flex flex-wrap gap-2">
            {notApplicableCodes.map((code) => {
              return (
                <div key={code.code}>
                  <Badge variant="destructive" className="py-0 pr-0">
                    {code.code}
                    <Button
                      onClick={() => {
                        handleRemoveCode(code.code).catch((error) => {
                          reportError('cart/discount', error);
                        });
                      }}
                      className="cursor-pointer"
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove discount code ${code.code}`}
                    >
                      <X size={14} />
                    </Button>
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscountCodes;
