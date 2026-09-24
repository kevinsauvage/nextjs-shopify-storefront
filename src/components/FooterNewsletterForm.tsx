'use client';

import { useActionState, useRef } from 'react';

import { subscribeNewsletterAction } from '@/actions/newsletterActions';
import FormFieldError from '@/components/FormFieldError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFormToast } from '@/hooks/useFormToast';
import { emptyFormState, type FormState } from '@/types/formActions';

import { ArrowRight, Check } from 'lucide-react';

const FooterNewsletterForm = () => {
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (_previousState: unknown, formData: FormData) => {
    const email = String(formData.get('email') ?? '');
    const state = await subscribeNewsletterAction({ email });

    if (state.ok) {
      formRef.current?.reset();
    }

    return state;
  };

  const [state, action, isPending] = useActionState<FormState, FormData>(
    handleSubmit,
    emptyFormState,
  );

  useFormToast(state);

  const done = state.ok;

  return (
    <form action={action} className="mt-6 max-w-sm" ref={formRef}>
      <div className="flex gap-2">
        <div className="flex-1">
          <label htmlFor="footer-newsletter" className="sr-only">
            Email for newsletter
          </label>
          <Input
            id="footer-newsletter"
            name="email"
            type="email"
            required
            placeholder="Email for drops & offers"
            className="bg-background"
            disabled={isPending || done}
            autoComplete="email"
            aria-invalid={!!state.errors?.email}
            aria-describedby={state.errors?.email ? 'footer-newsletter-error' : undefined}
          />
        </div>
        <Button
          type="submit"
          aria-label={done ? 'Subscribed' : 'Subscribe'}
          disabled={isPending || done}
          loading={isPending}
        >
          {done ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <ArrowRight className="size-4" aria-hidden="true" />
          )}
        </Button>
      </div>
      <FormFieldError error={state.errors?.email} fieldId="footer-newsletter" />
      <span aria-live="polite" className="sr-only">
        {done ? (state.message ?? 'Thanks — you are on the list.') : ''}
      </span>
    </form>
  );
};

export default FooterNewsletterForm;
