'use client';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ChevronRight } from 'lucide-react';

/**
 * `decodeURIComponent` throws a `URIError` on malformed input (e.g. a bare `%`).
 * Breadcrumb labels come straight from the URL, so fall back to the raw segment
 * instead of crashing the render.
 */
const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const Crumbs = ({ title, href, last }: { title: string; href: Route; last: boolean }) => {
  if (last) {
    const t = safeDecode(title)
      .replace('gid://shopify/Order/', '')
      .replace('gid://shopify/MailingAddress/', '')
      .split('?')[0];
    return (
      <strong className="text-body-sm text-secondary text-ellipsis whitespace-nowrap font-semibold">
        {t}
      </strong>
    );
  }

  return (
    <>
      <Link
        href={href}
        className="text-body-sm text-secondary hover:text-primary transition-colors text-ellipsis whitespace-nowrap font-medium"
      >
        {safeDecode(title)}
      </Link>
      {!last && <ChevronRight size={16} className="text-secondary shrink-0" />}
    </>
  );
};

const Breadcrumbs = ({ lastElement }: { lastElement?: string }) => {
  const pathname = usePathname();

  const filterCrumb = new Set(['pages', 'reset', 'collections', 'products']);

  function generateBreadcrumbs() {
    const asPathNestedRoutes = pathname.split('/').filter((v) => v.length > 0);

    const crumbList = asPathNestedRoutes
      .map((subpath, index) => {
        // Built from the live pathname, so it cannot be statically verified;
        // the single assertion lives here instead of at each `Link`.
        const href = `/${asPathNestedRoutes.slice(0, index + 1).join('/')}` as Route;
        const title = subpath.split('-').join(' ').replaceAll('_', ' ');
        return {
          href,
          isNotClickable: filterCrumb.has(title.toLowerCase()),
          title,
        };
      })
      .filter((crumb) => !filterCrumb.has(crumb.title.toLowerCase()));

    return [{ href: '/', title: 'Home' } as const, ...crumbList];
  }

  // Call the function to generate the breadcrumbs list
  const breadcrumbs = generateBreadcrumbs();

  return (
    breadcrumbs.length > 1 && (
      <div>
        <nav className="md:block container mx-auto">
          <ol className="flex items-center space-x-1">
            {breadcrumbs.map((crumb, index) => (
              <li
                key={crumb.href}
                className="flex items-center space-x-1 overflow-ellipsis overflow-hidden"
              >
                {lastElement && index === breadcrumbs.length - 1 ? (
                  <p className="text-body-sm text-secondary font-medium text-ellipsis whitespace-nowrap overflow-hidden">
                    {lastElement}
                  </p>
                ) : (
                  <Crumbs {...crumb} last={index === breadcrumbs.length - 1} />
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>
    )
  );
};
export default Breadcrumbs;
