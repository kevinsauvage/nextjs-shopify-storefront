'use client';

import Link from 'next/link';

import config from '@/config';
import { useLocalList } from '@/hooks/useLocalList';
import {
  clearRecentSearches,
  RECENT_SEARCHES_KEY,
  RECENT_SEARCHES_MAX,
} from '@/lib/client/recentSearches';

import { History, X } from 'lucide-react';

/**
 * Device-local recent searches shown under the search box. Reads localStorage
 * through `useLocalList` (hydration-safe) and renders nothing when empty.
 */
const RecentSearches = () => {
  const terms = useLocalList(RECENT_SEARCHES_KEY, RECENT_SEARCHES_MAX);

  if (terms.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-caption text-secondary">
        <History size={13} aria-hidden="true" />
        Recent:
      </span>
      {terms.map((term) => (
        <Link
          key={term}
          href={`${config.routes.search}?searchQuery=${encodeURIComponent(term)}`}
          className="rounded-full border border-border px-3 py-1 text-caption text-secondary transition-colors hover:text-primary"
        >
          {term}
        </Link>
      ))}
      <button
        type="button"
        onClick={clearRecentSearches}
        aria-label="Clear recent searches"
        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-caption text-secondary transition-colors hover:text-primary"
      >
        <X size={13} aria-hidden="true" />
        Clear
      </button>
    </div>
  );
};

export default RecentSearches;
