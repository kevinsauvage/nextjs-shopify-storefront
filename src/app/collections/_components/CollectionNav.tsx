'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { normalizeMenuHref } from '@/utils/url';

export type CollectionNavItem = {
  id: string;
  title: string;
  url?: string | null;
};

const CollectionNav = ({
  items,
  collectionSlug,
}: {
  items: CollectionNavItem[] | null | undefined;
  collectionSlug: string;
}) => {
  const menuItems = items || [];

  return (
    <div className="container mx-auto">
      <nav>
        <ul className="flex items-center flex-wrap gap-4">
          {Array.isArray(menuItems) &&
            menuItems.map(
              (menuItem) =>
                typeof menuItem.url === 'string' && (
                  <li key={menuItem.id}>
                    <Button
                      variant={
                        menuItem?.url?.toLowerCase().includes(collectionSlug?.toLowerCase())
                          ? 'default'
                          : 'secondary'
                      }
                      asChild
                    >
                      <Link
                        href={normalizeMenuHref(menuItem?.url)}
                      >
                        {menuItem?.title}
                      </Link>
                    </Button>
                  </li>
                ),
            )}
        </ul>
      </nav>
    </div>
  );
};

export default CollectionNav;
