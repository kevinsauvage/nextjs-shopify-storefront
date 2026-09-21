'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Check, SortDesc } from 'lucide-react';

const Sort = ({
  query,
  sortingOptions,
}: {
  query: {
    sort_key?: string;
  };
  sortingOptions: { label: string; name: string }[];
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParameters = useSearchParams();

  const activeOption =
    sortingOptions.find((item) => item.name.toLowerCase() === query.sort_key?.toLowerCase()) ??
    sortingOptions[0];

  const handleChange = (value: string) => {
    const parameters = new URLSearchParams(searchParameters.toString());
    parameters.set('sort_key', value);
    // A different sort order invalidates the current cursor.
    parameters.delete('after');
    parameters.delete('before');

    router.push(`${pathname}?${parameters.toString()}`);
  };

  return (
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
                onClick={() => handleChange(option.name)}
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
};

export default Sort;
