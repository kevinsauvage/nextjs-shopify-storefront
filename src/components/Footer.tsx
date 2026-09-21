import Link from 'next/link';

import { logo } from '@/assets/svg';
import siteMetadata from '@/data/siteMetadata';
import type { GetMenuByHandleQuery } from '@/shopify/storefront';
import { normalizeMenuHref } from '@/utils/url';

type MenuItem = NonNullable<GetMenuByHandleQuery['menu']>['items'][number];

type FooterProps = {
  menuItems: MenuItem[] | undefined;
};

const Footer = ({ menuItems }: FooterProps) => {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="container mx-auto px-4 py-14 md:px-6 md:py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <Link href="/" aria-label="Link to home page" className="inline-block text-foreground">
              {logo}
            </Link>
            <p className="mt-5 max-w-sm text-body-sm text-secondary">
              {siteMetadata?.about?.short}
            </p>
          </div>

          <nav className="lg:col-span-7" aria-label="Footer">
            <ul className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-3">
              {Array.isArray(menuItems) &&
                menuItems.map((item) => (
                  <li key={item.id}>
                    <h3 className="text-eyebrow mb-4">{item.title}</h3>
                    <ul className="space-y-2.5">
                      {item?.items?.map((element) => (
                        <li key={element.id}>
                          {typeof element?.url === 'string' && (
                            <Link
                              href={normalizeMenuHref(element?.url)}
                              className="text-body-sm text-secondary transition-colors hover:text-foreground"
                            >
                              {element?.title}
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
            </ul>
          </nav>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-caption text-secondary">Copyright © 2025 All rights reserved.</p>
          <p className="text-caption text-secondary">Crafted with care.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
