'use client';

import { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { withQuery } from '@/utils/url';

import { Check, SortDesc } from 'lucide-react';

type SortOption = { label: string; name: string };

type SortProps = {
  query: {
    sort_key?: string;
  };
  sortingOptions: SortOption[];
};

const resolveActiveOption = (query: SortProps['query'], sortingOptions: SortOption[]) =>
  sortingOptions.find((item) => item.name.toLowerCase() === query.sort_key?.toLowerCase()) ??
  sortingOptions[0];

const SortView = ({
  activeOption,
  onSelect,
  sortingOptions,
}: {
  activeOption?: SortOption;
  onSelect?: (value: string) => void;
  sortingOptions: SortOption[];
}) => (
  <div className="flex items-center gap-2">
    <span className="hidden text-caption-sm uppercase tracking-widest text-muted sm:block">
      Sort
    </span>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {activeOption?.label || 'Sort'}
          <SortDesc className="h-4 w-4 opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" sideOffset={5} align="end">
        {sortingOptions.map((option) => {
          const isActive = option.name.toLowerCase() === activeOption?.name.toLowerCase();
          return (
            <DropdownMenuItem
              key={option.name}
              onClick={() => onSelect?.(option.name)}
              className="justify-between"
            >
              {option.label}
              {isActive ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

const SortInner = ({ query, sortingOptions }: SortProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParameters = useSearchParams();

  const activeOption = resolveActiveOption(query, sortingOptions);

  const handleChange = (value: string) => {
    const parameters = new URLSearchParams(searchParameters.toString());
    parameters.set('sort_key', value);
    // A different sort order invalidates the current cursor.
    parameters.delete('after');
    parameters.delete('before');

    router.push(withQuery(pathname, parameters));
  };

  return (
    <SortView activeOption={activeOption} onSelect={handleChange} sortingOptions={sortingOptions} />
  );
};

const Sort = (props: SortProps) => (
  <Suspense
    fallback={
      <SortView
        activeOption={resolveActiveOption(props.query, props.sortingOptions)}
        sortingOptions={props.sortingOptions}
      />
    }
  >
    <SortInner {...props} />
  </Suspense>
);

export default Sort;
