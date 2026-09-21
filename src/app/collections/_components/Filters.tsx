'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import type { Filter } from '@/shopify/storefront';

import { FilterIcon } from 'lucide-react';

// IMPORTANT: do not import runtime enums from `@/shopify/storefront` in client components.
// The generated Storefront SDK pulls in `graphql-request`/`graphql-tag` and will bloat the client bundle.
const FILTER_TYPE = {
  boolean: 'BOOLEAN',
  list: 'LIST',
  priceRange: 'PRICE_RANGE',
} as const;

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
  const [selectedFilters, setSelectedFilters] = useState<{ filterId: string; input: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 200]);
  const [priceTouched, setPriceTouched] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  const toSearchParameters = useCallback(
    () => new URLSearchParams(query as Record<string, string>),
    [query],
  );

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
    router.push(`${pathname}?${newSearchParameters.toString()}`);
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

    router.push(`${pathname}?${newSearchParameters.toString()}`);
  }, [
    filters,
    pathname,
    priceRange,
    priceTouched,
    router,
    selectedFilters,
    toSearchParameters,
  ]);

  useEffect(() => {
    const currentFilters_ = typeof query.filters === 'string' ? [query.filters] : query.filters;

    const f = currentFilters_
      ?.map((filter) => {
        const [filterId, input] = filter.split(/:(.+)/);
        return { filterId: filterId || '', input: input || '' };
      })
      .filter(
        (item): item is { filterId: string; input: string } =>
          item.filterId !== undefined && item.input !== undefined,
      );

    setTimeout(() => {
      setSelectedFilters(f || []);
    }, 0);
  }, [query.filters]);

  const getMinMaxPrice = useCallback((): [number, number] | undefined => {
    const priceRangeFilter = filters?.find((filter) => filter.type === FILTER_TYPE.priceRange);
    if (!priceRangeFilter || !priceRangeFilter.values?.[0]) {
      return undefined;
    }
    const input = priceRangeFilter.values[0].input as string;
    if (!input) return undefined;

    try {
      const parsedInput = JSON.parse(input) as { price?: { min?: number; max?: number } };
      const min = parsedInput?.price?.min ?? 0;
      const max = parsedInput?.price?.max ?? 200;
      return [min, max];
    } catch {
      return undefined;
    }
  }, [filters]);

  useEffect(() => {
    const priceRange_ = getMinMaxPrice();
    if (priceRange_) {
      setTimeout(() => {
        setPriceRange(priceRange_);
      }, 0);
    }
  }, [getMinMaxPrice]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <span className="hidden md:inline">Filters</span>
          <FilterIcon className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Open filters</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Select filters to narrow down your search results.</SheetDescription>
        </SheetHeader>
        <div className="px-4">
          <Accordion
            type="multiple"
            defaultValue={filters.map((filter) => filter.id)}
            className="w-full"
          >
            {filters.map((filter) => (
              <AccordionItem key={filter.id} value={filter.id}>
                <AccordionTrigger className="text-body-sm font-medium">
                  {filter.label}
                </AccordionTrigger>
                <AccordionContent>
                  {filter.type === FILTER_TYPE.priceRange && (
                    <div className="space-y-4 py-2">
                      <Slider
                        defaultValue={[getMinMaxPrice()?.[0] || 0, getMinMaxPrice()?.[1] || 200]}
                        max={getMinMaxPrice()?.[1] || 200}
                        min={getMinMaxPrice()?.[0] || 0}
                        step={0.1}
                        value={priceRange}
                        onValueChange={handlePriceChange}
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-body-sm">${(priceRange?.[0] ?? 0).toFixed(2)}</span>
                        <span className="text-body-sm">${(priceRange?.[1] ?? 200).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  {filter.type === FILTER_TYPE.list && (
                    <div className="space-y-2">
                      {filter.values.map((value, index) => (
                        <div
                          key={`${value.id}-${index + 1}`}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={value.id}
                            checked={isSelected(value.id, value.input as string)}
                            onCheckedChange={() => {
                              if (typeof value.input === 'string') {
                                handleSetFilters(value.id, value.input);
                              }
                            }}
                          />
                          <label
                            htmlFor={value.id}
                            className="text-body-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {value.label} ({value.count})
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
        <SheetFooter>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={resetFilters}>
              Reset
            </Button>
            <Button className="flex-1" onClick={applyFilters}>
              Apply Filters
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default Filters;
