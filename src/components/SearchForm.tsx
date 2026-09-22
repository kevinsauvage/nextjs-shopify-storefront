'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { searchAction } from '@/actions/searchActions';

import { Input } from './ui/input';
import { Label } from './ui/label';

import { Search } from 'lucide-react';

const SubmitButton = ({ ...properties }: React.ComponentProps<'button'>) => {
  const status = useFormStatus();
  return (
    <button
      type="submit"
      disabled={status.pending}
      className="group absolute right-3 top-1/2 -translate-y-1/2"
      aria-label="Search"
      {...properties}
    >
      <Search className="text-secondary group-hover:text-primary transition-colors" />
    </button>
  );
};

const SearchForm = ({
  value,
  onChange,
}: {
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}) => {
  const [, action] = useActionState(() => searchAction(value), value);

  return (
    <form action={action} className="relative w-full max-w-2xl mx-auto">
      <Label aria-label="Search" className="flex items-center">
        <Input
          className="py-7 pl-8 pr-11"
          type="text"
          name="searchQuery"
          placeholder="Search"
          aria-label="Search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          onChange={onChange}
          value={value}
        />
      </Label>
      <SubmitButton />
    </form>
  );
};

export default SearchForm;
