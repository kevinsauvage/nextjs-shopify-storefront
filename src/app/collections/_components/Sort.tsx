'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { SortDesc } from 'lucide-react';

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

  const handleChange = (value: string) => {
    const parameters = new URLSearchParams(searchParameters.toString());
    parameters.set('sort_key', value);
    // A different sort order invalidates the current cursor.
    parameters.delete('after');
    parameters.delete('before');

    router.push(`${pathname}?${parameters.toString()}`);
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <small>Sort by </small>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary">
            {sortingOptions.find(
              (item) => item.name.toLowerCase() === query.sort_key?.toLowerCase(),
            )?.label || 'Select an option'}
            <SortDesc className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" sideOffset={5} align="start">
          {sortingOptions.map((option) => (
            <DropdownMenuItem key={option.name} onClick={() => handleChange(option.name)}>
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default Sort;
