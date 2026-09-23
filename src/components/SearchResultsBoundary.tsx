'use client';

import { useEffect } from 'react';
import { catchError, type ErrorInfo } from 'next/error';

import { reportError } from '@/lib/logger';

/**
 * Component-level recovery for the predictive-search dropdown. Suggestions are
 * non-critical: when the island crashes, degrade to an announced status note
 * with a retry instead of taking down the whole header.
 */
const SearchResultsFallback = (
  _properties: { children?: React.ReactNode },
  errorInfo: ErrorInfo,
) => {
  useEffect(() => {
    reportError('search-results-boundary', errorInfo.error);
  }, [errorInfo]);

  return (
    <div
      role="status"
      className="absolute border z-50 w-full mt-2 shadow-lg text-start overflow-hidden bg-background rounded-lg p-4"
    >
      <p className="text-body-sm text-secondary">Suggestions are unavailable right now.</p>
      <button
        type="button"
        onClick={() => errorInfo.retry()}
        className="link-underline text-body-sm font-medium text-secondary cursor-pointer"
      >
        Try again
      </button>
    </div>
  );
};

export default catchError(SearchResultsFallback);
