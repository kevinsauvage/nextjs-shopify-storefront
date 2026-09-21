'use client';

import { Badge } from '@/components/ui/badge';
import useCartContext from '@/contexts/CartContext/useCartContext';

import { ShoppingCart } from 'lucide-react';

const CartHeader = () => {
  const { cart } = useCartContext();
  const itemCount = cart?.totalQuantity || 0;
  const itemText = itemCount === 1 ? 'Item' : 'Items';

  return (
    <div className="flex items-center gap-2">
      <ShoppingCart className="h-5 w-5 text-secondary" />
      <Badge variant="secondary" className="font-semibold">
        {itemCount} {itemText}
      </Badge>
    </div>
  );
};

export default CartHeader;
