'use client';

import CardHeaderPattern from '@/components/CardHeaderPattern';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import useCartContext from '@/contexts/CartContext/useCartContext';

import LineItem from './LineItem';

const CartItemsList = () => {
  const { cart } = useCartContext();

  if (!cart) return null;

  return (
    <Card>
      <CardHeaderPattern className="pb-4 md:pb-6" title="Cart Items" size={3} as="h2" />
      <CardContent>
        <div className="space-y-6">
          {cart.lines.edges.map(({ node }, index) => (
            <div key={node.id}>
              <LineItem node={node} />
              {index < cart.lines.edges.length - 1 && <Separator className="my-6" />}
            </div>
          ))}
        </div>
      </CardContent>
      {cart.lines.pageInfo.hasNextPage && (
        <CardFooter className="pt-4 md:pt-6 border-t">
          <p className="text-body-sm text-secondary">More items available</p>
        </CardFooter>
      )}
    </Card>
  );
};

export default CartItemsList;
