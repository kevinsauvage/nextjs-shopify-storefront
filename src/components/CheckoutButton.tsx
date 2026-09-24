import { Button } from '@/components/ui/button';

import { ArrowRight } from 'lucide-react';

const CheckoutButton = ({ checkoutUrl }: { checkoutUrl: string }) => {
  return (
    <Button
      className="w-full py-6 text-body-lg font-semibold shadow-lg hover:shadow-xl transition-shadow"
      size="lg"
      asChild
    >
      {/* Shopify checkout is an external, full-page navigation: use an anchor
          so the App Router does not attempt a client-side transition. */}
      <a href={checkoutUrl} rel="noopener noreferrer">
        Proceed to Checkout
        <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
      </a>
    </Button>
  );
};

export default CheckoutButton;
