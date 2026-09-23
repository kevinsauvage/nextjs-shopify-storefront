import type { Metadata } from 'next';

import seo from '@/data/seo';

import WishlistContent from './_components/WishlistContent';

export const metadata: Metadata = {
  description: seo.account.wishlist.description,
  title: seo.account.wishlist.title,
};

const Wishlist = () => <WishlistContent />;

export default Wishlist;
