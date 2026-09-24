'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import type { Filter } from '@/shopify/storefront';
import { cn } from '@/utils/cn';
import { withQuery } from '@/utils/url';

import { Check, RotateCcw, SlidersHorizontal, Sparkles } from 'lucide-react';

// IMPORTANT: do not import runtime enums from `@/shopify/storefront` in client components.
// The generated Storefront SDK pulls in `graphql-request`/`graphql-tag` and will bloat the client bundle.
const FILTER_TYPE = {
  boolean: 'BOOLEAN',
  list: 'LIST',
  priceRange: 'PRICE_RANGE',
} as const;

/**
 * Shopify reports the collection's real price span on the price-range filter's
 * first value, so the slider bounds come from the catalog data instead of a
 * hardcoded ceiling that would clip expensive products.
 */
const getPriceBounds = (filters: Filter[]): [number, number] | undefined => {
  const priceRangeFilter = filters?.find((filter) => filter.type === FILTER_TYPE.priceRange);
  const input = priceRangeFilter?.values?.[0]?.input as string | undefined;
  if (!input) return undefined;

  try {
    const parsedInput = JSON.parse(input) as { price?: { min?: number; max?: number } };
    const min = parsedInput?.price?.min;
    const max = parsedInput?.price?.max;
    if (typeof min !== 'number' || typeof max !== 'number') return undefined;
    return [min, max];
  } catch {
    return undefined;
  }
};

type SelectedFilter = { filterId: string; input: string };

/** Parse the `filters` URL params (`<filterId>:<input>`) back into selections. */
const parseSelectedFilters = (filters?: string | string[]): SelectedFilter[] => {
  const current = typeof filters === 'string' ? [filters] : filters;

  return (
    current
      ?.map((filter) => {
        const [filterId, input] = filter.split(/:(.+)/);
        return { filterId: filterId || '', input: input || '' };
      })
      .filter(
        (item): item is SelectedFilter => item.filterId !== undefined && item.input !== undefined,
      ) || []
  );
};

const Filters = ({
  filters,
  query,
}: {
  filters: Filter[];
  query: {
    after?: string;
    before?: string;
    filters?: string | string[];
    sort_key?: string;
  };
}) => {
  const priceBounds = getPriceBounds(filters);
  const [selectedFilters, setSelectedFilters] = useState<SelectedFilter[]>([]);
  const [open, setOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<number[]>(() =>
    priceBounds ? [...priceBounds] : [0, 0],
  );
  const [priceTouched, setPriceTouched] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  const toSearchParameters = useCallback(() => {
    const parameters = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const entry of value) parameters.append(key, entry);
      } else {
        parameters.append(key, value);
      }
    }
    return parameters;
  }, [query]);

  const isSelected = useCallback(
    (filterId: string, input: string) =>
      selectedFilters?.some((filter) => filter.input === input && filter.filterId === filterId),
    [selectedFilters],
  );

  const handleSetFilters = useCallback(
    (filterId: string, input: string) => {
      if (isSelected(filterId, input)) {
        const newFilters = selectedFilters.filter((filter) => {
          if (filter.filterId !== filterId) return true;
          return filter.input !== input;
        });

        setSelectedFilters(newFilters);
      } else {
        setSelectedFilters([...selectedFilters, { filterId, input }]);
      }
    },
    [isSelected, selectedFilters],
  );

  const handlePriceChange = (value: number[]) => {
    setPriceTouched(true);
    setPriceRange(value);
  };

  const resetFilters = useCallback(() => {
    const newSearchParameters = toSearchParameters();
    newSearchParameters.delete('filters');
    newSearchParameters.delete('after');
    newSearchParameters.delete('before');
    setPriceTouched(false);
    setSelectedFilters([]);
    router.push(withQuery(pathname, newSearchParameters));
  }, [pathname, router, toSearchParameters]);

  const applyFilters = useCallback(() => {
    const newSearchParameters = toSearchParameters();
    newSearchParameters.delete('filters');
    newSearchParameters.delete('after');
    newSearchParameters.delete('before');

    const priceFilterId = filters?.find((filter) => filter.type === FILTER_TYPE.priceRange)?.id;
    const hasExistingPriceFilter = selectedFilters.some(
      (filter) => filter.filterId === priceFilterId,
    );

    selectedFilters
      .filter((filter) => filter.filterId !== priceFilterId)
      .forEach((filter) => {
        newSearchParameters.append('filters', `${filter.filterId}:${filter.input}`);
      });

    // Only emit the price filter when it is meaningful (changed or already applied).
    if (priceFilterId && (priceTouched || hasExistingPriceFilter)) {
      newSearchParameters.append(
        'filters',
        `price:${JSON.stringify({ price: { max: priceRange[1], min: priceRange[0] } })}`,
      );
    }

    router.push(withQuery(pathname, newSearchParameters));
    setOpen(false);
  }, [filters, pathname, priceRange, priceTouched, router, selectedFilters, toSearchParameters]);

  // The sheet is a draft: toggles only touch local state until Apply pushes
  // them to the URL, so the URL params are synced back into state here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing URL params into draft state
    setSelectedFilters(parseSelectedFilters(query.filters));
  }, [query.filters]);

  // Keep the slider in sync when the collection (and therefore its price span)
  // changes, without clobbering a value the user is actively dragging.
  const boundMin = priceBounds?.[0];
  const boundMax = priceBounds?.[1];

  useEffect(() => {
    if (boundMin === undefined || boundMax === undefined) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing catalog price span into slider state
    setPriceRange([boundMin, boundMax]);
  }, [boundMin, boundMax]);

  const countFor = (filterId: string) =>
    selectedFilters.filter((filter) => filter.filterId === filterId).length;

  const activeCount = selectedFilters.length + (priceTouched ? 1 : 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="relative gap-2 rounded-full border-border/70 bg-background/70 px-5 backdrop-blur transition-all duration-200 hover:-translate-y-px hover:shadow-[0_12px_24px_-16px_rgb(12_10_9/0.5)]"
        >
          <SlidersHorizontal size={15} strokeWidth={1.75} aria-hidden="true" />
          <span>Filters</span>
          {activeCount > 0 && (
            <Badge className="h-5 min-w-5 justify-center rounded-full bg-[var(--gold)] px-1.5 text-[11px] font-bold text-[var(--gold-foreground)]">
              {activeCount}
            </Badge>
          )}
          <span className="sr-only">Open filters</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="hero-mesh flex max-h-dvh w-full flex-col gap-0 overflow-hidden border-l border-border/60 p-0 sm:max-w-md"
      >
        <SheetHeader className="relative shrink-0 gap-0 border-b border-border/60 p-0 text-left">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-16 -top-20 size-56 rounded-full bg-[var(--gold)]/10 blur-3xl" />
          </div>
          <div className="relative p-6 pb-5 pr-14">
            <span className="text-eyebrow-gold inline-flex items-center gap-2">
              <Sparkles size={13} aria-hidden="true" />
              Refine
            </span>
            <div className="mt-2 flex items-center gap-3">
              <SheetTitle className="font-display text-3xl font-medium tracking-tight">
                Filters
              </SheetTitle>
              {activeCount > 0 && (
                <Badge className="rounded-full bg-[var(--gold-soft)] text-[var(--gold)]">
                  {activeCount} active
                </Badge>
              )}
            </div>
            <SheetDescription className="text-body-sm mt-1.5 text-secondary">
              Narrow the collection to exactly your taste.
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <Accordion
            type="multiple"
            defaultValue={filters.map((filter) => filter.id)}
            className="w-full space-y-2"
          >
            {filters.map((filter) => {
              const selected = countFor(filter.id);
              return (
                <AccordionItem
                  key={filter.id}
                  value={filter.id}
                  className="overflow-hidden rounded-2xl border border-border/70 bg-card/90 px-4 backdrop-blur transition-colors last:border-b hover:border-foreground/15"
                >
                  <AccordionTrigger className="cursor-pointer py-4 text-body-sm font-semibold hover:no-underline">
                    <span className="flex flex-1 items-center gap-2.5">
                      {filter.label}
                      {selected > 0 && (
                        <span
                          aria-hidden="true"
                          className="flex size-5 items-center justify-center rounded-full bg-[var(--gold)] text-[10px] font-bold text-[var(--gold-foreground)]"
                        >
                          {selected}
                        </span>
                      )}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    {filter.type === FILTER_TYPE.priceRange && (
                      <div className="space-y-4 rounded-xl bg-[var(--sidebar)]/70 p-4">
                        <Slider
                          defaultValue={[boundMin ?? 0, boundMax ?? 0]}
                          max={boundMax ?? 0}
                          min={boundMin ?? 0}
                          step={0.1}
                          value={priceRange}
                          onValueChange={handlePriceChange}
                          thumbLabels={['Minimum price', 'Maximum price']}
                        />
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded-full border border-border/70 bg-card px-3 py-1 text-body-sm font-semibold tabular-nums">
                            ${(priceRange?.[0] ?? boundMin ?? 0).toFixed(0)}
                          </span>
                          <span aria-hidden="true" className="h-px w-6 bg-border" />
                          <span className="rounded-full border border-border/70 bg-card px-3 py-1 text-body-sm font-semibold tabular-nums">
                            ${(priceRange?.[1] ?? boundMax ?? 0).toFixed(0)}
                          </span>
                        </div>
                      </div>
                    )}
                    {filter.type === FILTER_TYPE.list && (
                      <div className="space-y-1">
                        {filter.values.map((value, index) => {
                          const checked = isSelected(value.id, value.input as string);
                          return (
                            <button
                              key={`${value.id}-${index + 1}`}
                              type="button"
                              role="checkbox"
                              aria-checked={checked}
                              onClick={() => {
                                if (typeof value.input === 'string') {
                                  handleSetFilters(value.id, value.input);
                                }
                              }}
                              className={cn(
                                'flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-150',
                                checked
                                  ? 'border-[var(--gold)]/40 bg-[var(--gold-soft)]'
                                  : 'border-transparent hover:border-border/70 hover:bg-muted/60',
                              )}
                            >
                              <span
                                aria-hidden="true"
                                className={cn(
                                  'flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input shadow-xs transition-shadow dark:bg-input/30',
                                  checked &&
                                    'border-[var(--gold)] bg-[var(--gold)] text-[var(--gold-foreground)]',
                                )}
                              >
                                {checked ? <Check className="size-3.5" /> : null}
                              </span>
                              <span className="flex flex-1 items-center justify-between gap-2 text-body-sm font-medium leading-none">
                                {value.label}
                                <span className="text-caption tabular-nums text-secondary">
                                  {value.count}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>

        <div className="glass shrink-0 border-t border-border/60 p-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-11 flex-1 cursor-pointer rounded-full"
              onClick={resetFilters}
              disabled={activeCount === 0}
            >
              <RotateCcw size={15} aria-hidden="true" />
              Clear{activeCount > 0 ? ` (${activeCount})` : ''}
            </Button>
            <Button className="h-11 flex-[2] cursor-pointer rounded-full" onClick={applyFilters}>
              Show results
            </Button>
          </div>
          <p className="mt-3 text-center text-caption text-secondary">
            {activeCount > 0
              ? `${activeCount} filter${activeCount === 1 ? '' : 's'} selected`
              : 'No filters selected — showing everything'}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default Filters;
