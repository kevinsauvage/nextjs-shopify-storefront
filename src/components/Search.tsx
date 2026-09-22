'use client';

import type { RefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

import SearchForm from '@/components/SearchForm';
import useOnClickOutside from '@/hooks/useClickOutside';
import type { PredictiveSearchQuery } from '@/shopify/storefront';
import debounce from '@/utils/debounce';

const SearchResults = dynamic(() => import('@/components/SearchResults'));

const Search = ({ searchQuery }: { searchQuery: string }) => {
  const [searchValue, setSearchValue] = useState(searchQuery);
  const [results, setResults] = useState<PredictiveSearchQuery['predictiveSearch'] | null>(null);
  const reference = useRef<HTMLDivElement | null>(null);
  // Tracks the latest request so slower earlier responses cannot overwrite it.
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useOnClickOutside(reference as RefObject<HTMLElement>, () => {
    abortRef.current?.abort();
    requestIdRef.current += 1;
    setResults(null);
  });

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleChange = useCallback(async (value: string) => {
    if (value?.trim().length < 2) {
      abortRef.current?.abort();
      requestIdRef.current += 1;
      setResults(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = (requestIdRef.current += 1);

    try {
      const response = await fetch(`/api/search/predictive?q=${encodeURIComponent(value.trim())}`, {
        signal: controller.signal,
      });

      if (requestId !== requestIdRef.current) return;

      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }

      // The API wraps payloads in a `{ data, success }` envelope.
      const payload = await response.json();

      if (requestId !== requestIdRef.current) return;

      setResults(payload?.data?.predictiveSearch || null);
    } catch (error) {
      // Aborted requests are expected; only surface genuine failures.
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;

      console.error('Search error:', error);
      setResults(null);
    }
  }, []);

  const debouncedHandleChange = useMemo(
    () =>
      debounce((value: unknown) => {
        if (typeof value !== 'string') return;
        handleChange(value);
      }, 500),
    [handleChange],
  );

  useEffect(() => {
    return () => debouncedHandleChange.cancel();
  }, [debouncedHandleChange]);

  return (
    <div className="relative w-full max-w-lg mx-auto" ref={reference}>
      <SearchForm
        value={searchValue}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          setSearchValue(event.target.value);
          debouncedHandleChange(event.target.value);
        }}
      />

      {results && <SearchResults results={results} />}
    </div>
  );
};

export default Search;
