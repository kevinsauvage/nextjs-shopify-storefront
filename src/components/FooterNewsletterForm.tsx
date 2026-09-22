'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { ArrowRight, Check } from 'lucide-react';

const FooterNewsletterForm = () => {
  const [done, setDone] = useState(false);

  return (
    <form
      className="mt-6 flex max-w-sm gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        setDone(true);
      }}
    >
      <label htmlFor="footer-newsletter" className="sr-only">
        Email for newsletter
      </label>
      <Input
        id="footer-newsletter"
        type="email"
        required
        placeholder="Email for drops & offers"
        className="bg-background"
        disabled={done}
      />
      <Button type="submit" aria-label={done ? 'Subscribed' : 'Subscribe'} disabled={done}>
        {done ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <ArrowRight className="size-4" aria-hidden="true" />
        )}
      </Button>
      <span aria-live="polite" className="sr-only">
        {done ? 'Thanks — you are on the list.' : ''}
      </span>
    </form>
  );
};

export default FooterNewsletterForm;
