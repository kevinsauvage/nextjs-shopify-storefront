'use client';

import { useCallback } from 'react';

import QuantityStepper from '@/components/QuantityStepper';
import useCartContext from '@/contexts/CartContext/useCartContext';

const QuantityUpdatedContainer = ({
  originalQuantity,
  quantityAvailable,
  id,
  disabled = false,
}: {
  originalQuantity: number;
  quantityAvailable?: number | null;
  id: string;
  disabled?: boolean;
}) => {
  const { handleQuantityChange } = useCartContext();

  const handleChange = useCallback(
    (quantity: number) => handleQuantityChange(id, quantity),
    [handleQuantityChange, id],
  );

  return (
    <QuantityStepper
      quantity={originalQuantity}
      onChange={handleChange}
      quantityAvailable={quantityAvailable}
      disabled={disabled}
    />
  );
};

export default QuantityUpdatedContainer;
