import type { Metadata } from 'next';

import seo from '@/data/seo';

import CartView from './_components/CartView';

export const metadata: Metadata = {
  description: seo.cart.description,
  title: seo.cart.title,
};

const CartPage = () => <CartView />;

export default CartPage;
