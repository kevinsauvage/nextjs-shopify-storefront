import type { Metadata } from 'next';

import PageBanner from '@/components/PageBanner';
import seo from '@/data/seo';

import WishlistContent from './_components/WishlistContent';

export const metadata: Metadata = {
  description: seo.wishlist.description,
  title: seo.wishlist.title,
  // The list lives in per-browser storage (localStorage), so the page has no
  // server-rendered content worth indexing; robots.ts disallows it as well.
  robots: { index: false, follow: false },
};

const WishlistPage = () => (
  <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
    <PageBanner
      eyebrow="Saved pieces"
      title="Your Wishlist"
      description="Pieces you have saved. Tap the heart on any product to add more."
      className="w-full rounded-[var(--radius)]"
    />
    <div className="mt-8">
      <WishlistContent />
    </div>
  </div>
);

export default WishlistPage;
