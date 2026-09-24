import 'server-only';

import { reportError } from '@/lib/logger';
import { storefrontSdk } from '@/shopify';

/**
 * Metaobject type a merchant creates to curate the "Popular searches" chips on
 * `/search`. Entry fields may use any of the keys below (first non-empty wins),
 * so merchandisers are not locked to one schema. See README.
 */
export const POPULAR_SEARCH_METAOBJECT_TYPE = 'popular_search_term';

const TERM_FIELD_KEYS = ['term', 'query', 'label', 'title'] as const;

const MAX_POPULAR_SEARCHES = 8;

/** Fallback chips shown when the merchant has not curated any terms. */
export const DEFAULT_POPULAR_SEARCHES: readonly string[] = [
  'Linen',
  'Denim',
  'Dress',
  'Knit',
  'Boots',
];

const pickTerm = (fields: Array<{ key: string; value?: string | null }>): string | null => {
  for (const key of TERM_FIELD_KEYS) {
    const value = fields.find((field) => field.key === key)?.value?.trim();

    if (value) return value;
  }

  return null;
};

/**
 * Curated popular search terms from a `popular_search_term` metaobject, falling
 * back to a static list when the type is missing/empty or the read fails.
 */
export const getPopularSearchTerms = async (): Promise<string[]> => {
  try {
    const response = await storefrontSdk().getShopMetaObjects({
      first: MAX_POPULAR_SEARCHES,
      type: POPULAR_SEARCH_METAOBJECT_TYPE,
    });

    const terms = (response.metaobjects?.edges ?? [])
      .map((edge) => pickTerm(edge.node.fields))
      .filter((term): term is string => Boolean(term));

    return terms.length > 0
      ? Array.from(new Set(terms)).slice(0, MAX_POPULAR_SEARCHES)
      : [...DEFAULT_POPULAR_SEARCHES];
  } catch (error) {
    reportError('getPopularSearchTerms', error);
    return [...DEFAULT_POPULAR_SEARCHES];
  }
};
