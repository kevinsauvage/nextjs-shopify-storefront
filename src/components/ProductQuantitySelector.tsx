'use client';

import { getQuantityCap } from '@/utils/inventory';

import { Button } from './ui/button';

import { Minus, Plus } from 'lucide-react';

type ProductQuantitySelectorProps = {
  quantity: number;
  onChange: (quantity: number) => void;
  quantityAvailable?: number | null;
  disabled?: boolean;
  showAvailable?: boolean;
};

/**
 * Shared quantity stepper for the PDP and quick view. Untracked inventory
 * (`quantityAvailable == null`) is treated as unlimited.
 */
const ProductQuantitySelector = ({
  quantity,
  onChange,
  quantityAvailable,
  disabled,
  showAvailable = false,
}: ProductQuantitySelectorProps) => {
  const cap = getQuantityCap(quantityAvailable);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center border rounded-lg">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-r-none"
          onClick={() => onChange(quantity - 1)}
          disabled={disabled || quantity <= 1}
          aria-label="Decrease quantity"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-12 text-center text-body font-medium">{quantity}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-l-none"
          onClick={() => onChange(quantity + 1)}
          disabled={disabled || (cap !== undefined && quantity >= cap)}
          aria-label="Increase quantity"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {showAvailable && cap !== undefined && (
        <span className="text-body-sm text-secondary">{cap} available</span>
      )}
    </div>
  );
};

export default ProductQuantitySelector;
