'use client';

import QuantityUpdater from '@/components/QuantityUpdater';
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

  return (
    <QuantityUpdater
      originalQuantity={originalQuantity}
      quantityAvailable={quantityAvailable}
      productId={id}
      onChange={handleQuantityChange}
      disabled={disabled}
    />
  );
};

export default QuantityUpdatedContainer;
