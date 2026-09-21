import Link from 'next/link';

import siteMetadata from '@/data/siteMetadata';
import type { GetMenuByHandleQuery } from '@/shopify/storefront';
import { normalizeMenuHref } from '@/utils/url';

type MenuItem = NonNullable<GetMenuByHandleQuery['menu']>['items'][number];

type FooterProps = {
  menuItems: MenuItem[] | undefined;
};

const Footer = ({ menuItems }: FooterProps) => {
  return (
    <footer className="flex flex-col py-10 gap-10 border-t">
      <div className="container mx-auto flex flex-col justify-between md:grid grid-cols-2 gap-8 px-4">
        <div className="flex flex-col max-w-80 mb-8">
          <h3 className="text-heading-4 pb-3">About</h3>
          <p className="max-w-xl text-body-sm text-secondary">{siteMetadata?.about?.short}</p>
        </div>
        <ul className="flex flex-wrap justify-between gap-8 mb-8 md:grid md:grid-cols-3 ">
          {Array.isArray(menuItems) &&
            menuItems.map((item) => (
              <li key={item.id}>
                <h4 className="text-heading-4 block pb-3">{item.title}</h4>
                <ul>
                  {item?.items?.map((element) => (
                    <li className="mb-1" key={element.id}>
                      {typeof element?.url === 'string' && (
                        <Link
                          href={normalizeMenuHref(element?.url)}
                          className="text-body-sm text-secondary hover:text-primary transition-colors"
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
      </div>
      <div className="text-center">
        <p className="text-caption text-secondary">Copyright © 2025 All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
