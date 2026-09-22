import type { Metadata } from 'next';

import seo from '@/data/seo';

import CartView from './_components/CartView';

export const metadata: Metadata = {
  description: seo.cart.description,
  title: seo.cart.title,
  // The cart is user-specific and already disallowed in robots.ts; the
  // `noindex` directive additionally prevents indexing of linked URLs.
  robots: { index: false, follow: false },
};

const CartPage = () => <CartView />;

export default CartPage;
