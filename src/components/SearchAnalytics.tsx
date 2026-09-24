'use client';

import { useEffect } from 'react';

import { trackSearch } from '@/lib/client/analytics';
import { addRecentSearch } from '@/lib/client/recentSearches';

/**
 * Records a performed search: stores the term on-device (for the recent-searches
 * list) and fires the GA4 `search` event. Renders nothing.
 */
const SearchAnalytics = ({
  searchTerm,
  resultsCount,
}: {
  searchTerm: string;
  resultsCount?: number;
}) => {
  useEffect(() => {
    if (!searchTerm.trim()) return;

    addRecentSearch(searchTerm);
    trackSearch({ searchTerm, resultsCount });
  }, [searchTerm, resultsCount]);

  return null;
};

export default SearchAnalytics;
