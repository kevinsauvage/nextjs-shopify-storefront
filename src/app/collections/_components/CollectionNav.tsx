'use client';

import Link from 'next/link';

import { cn } from '@/utils/cn';
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
  const menuItems = (items || []).filter((item) => typeof item.url === 'string');

  if (menuItems.length === 0) return null;

  return (
    <nav
      aria-label="Collections"
      className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:-mx-6 md:px-6"
    >
      <ul className="flex items-center gap-6 whitespace-nowrap">
        {menuItems.map((menuItem) => {
          const isActive = menuItem.url?.toLowerCase().includes(collectionSlug?.toLowerCase());
          return (
            <li key={menuItem.id}>
              <Link
                href={normalizeMenuHref(menuItem.url)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'link-underline text-body-sm font-medium transition-colors',
                  isActive ? 'text-foreground' : 'text-secondary hover:text-foreground',
                )}
              >
                {menuItem.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default CollectionNav;
