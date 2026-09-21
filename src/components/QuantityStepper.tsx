'use client';

import { useCallback, useState } from 'react';

import SpinnerLoader from '@/components/SpinnerLoader';
import { cn } from '@/utils/cn';
import { getQuantityCap } from '@/utils/inventory';

import { Button } from './ui/button';

import { Minus, Plus } from 'lucide-react';

type QuantityStepperProps = {
  quantity: number;
  onChange: (quantity: number) => void | Promise<void>;
  quantityAvailable?: number | null;
  disabled?: boolean;
  showAvailable?: boolean;
  className?: string;
};

/**
 * Shared quantity stepper for the cart, PDP and quick view. Handles both sync
 * and async change handlers (the cart awaits a server round-trip) and treats
 * untracked inventory (`quantityAvailable == null`) as unlimited.
 */
const QuantityStepper = ({
  quantity,
  onChange,
  quantityAvailable,
  disabled,
  showAvailable = false,
  className,
}: QuantityStepperProps) => {
  const [pending, setPending] = useState(false);
  const cap = getQuantityCap(quantityAvailable);

  const update = useCallback(
    async (nextQuantity: number) => {
      if (pending || nextQuantity < 1) return;
      if (cap !== undefined && nextQuantity > cap) return;

      const result = onChange(nextQuantity);
      if (result instanceof Promise) {
        setPending(true);
        try {
          await result;
        } catch {
          // The change handler surfaces failures; keep the stepper responsive.
        } finally {
          setPending(false);
        }
      }
    },
    [cap, onChange, pending],
  );

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex items-center rounded-lg border">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-r-none"
          onClick={() => update(quantity - 1)}
          disabled={disabled || pending || quantity <= 1}
          aria-label="Decrease quantity"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span
          className="flex w-12 items-center justify-center text-body font-medium"
          aria-live="polite"
        >
          {pending ? <SpinnerLoader size="sm" /> : quantity}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-l-none"
          onClick={() => update(quantity + 1)}
          disabled={disabled || pending || (cap !== undefined && quantity >= cap)}
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

export default QuantityStepper;
