import Link from 'next/link';

import { logo } from '@/assets/svg';
import { Button } from '@/components/ui/button';
import siteMetadata from '@/data/siteMetadata';
import type { GetMenuByHandleQuery } from '@/shopify/storefront';
import { normalizeMenuHref } from '@/utils/url';

import FooterNewsletterForm from './FooterNewsletterForm';

import { Award, Instagram, Linkedin, RotateCcw, ShieldCheck, Truck, Twitter } from 'lucide-react';

type MenuItem = NonNullable<GetMenuByHandleQuery['menu']>['items'][number];

type FooterProps = {
  menuItems: MenuItem[] | undefined;
};

const socials = [
  { label: 'Instagram', href: siteMetadata.instagram, Icon: Instagram },
  { label: 'Twitter', href: siteMetadata.twitter, Icon: Twitter },
  { label: 'LinkedIn', href: siteMetadata.linkedin, Icon: Linkedin },
];

const Footer = ({ menuItems }: FooterProps) => {
  return (
    <footer className="mt-auto border-t border-border bg-[var(--sidebar)]">
      <div className="container mx-auto px-4 py-14 md:px-6 md:py-16">
        <div className="grid grid-cols-1 gap-10 rounded-[var(--radius)] border border-border/70 bg-card p-6 shadow-[0_18px_50px_-30px_rgb(12_10_9/0.35)] md:p-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <Link href="/" aria-label="Link to home page" className="inline-block text-foreground">
              {logo}
            </Link>
            <p className="mt-5 max-w-sm text-body-sm text-secondary">
              {siteMetadata?.about?.short}
            </p>
            <FooterNewsletterForm />
            <div className="mt-6 flex items-center gap-2">
              {socials.map(({ label, href, Icon }) => (
                <Button key={label} variant="outline" size="icon" asChild className="rounded-full">
                  <a href={href} aria-label={label} target="_blank" rel="noreferrer">
                    <Icon className="size-4" aria-hidden="true" />
                  </a>
                </Button>
              ))}
            </div>
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
                              className="link-underline text-body-sm text-secondary transition-colors hover:text-foreground"
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

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-caption text-secondary md:justify-between">
          <span className="inline-flex items-center gap-2">
            <Truck className="size-4 text-[var(--gold)]" aria-hidden="true" /> Free shipping over
            $150
          </span>
          <span className="inline-flex items-center gap-2">
            <RotateCcw className="size-4 text-[var(--gold)]" aria-hidden="true" /> 30-day returns
          </span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="size-4 text-[var(--gold)]" aria-hidden="true" /> Secure checkout
          </span>
          <span className="inline-flex items-center gap-2">
            <Award className="size-4 text-[var(--gold)]" aria-hidden="true" /> Quality guaranteed
          </span>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-caption text-secondary">
            Copyright © {new Date().getFullYear()} {siteMetadata.companyName}. All rights reserved.
          </p>
          <p className="text-caption text-secondary">Crafted with care.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
