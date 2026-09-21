'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { contactAction } from '@/actions/contactActions';
import FormFieldError from '@/components/FormFieldError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFormStatesEffect } from '@/hooks/useFormStatesEffect';
import type { CustomerUserError } from '@/shopify/storefront';

const SubmitButton = () => {
  const status = useFormStatus();
  return (
    <Button type="submit" loading={status.pending}>
      Send message
    </Button>
  );
};

const ContactForm = () => {
  const handleSubmit = async (_previousState: unknown, formData: FormData) => {
    const email = formData.get('email') as string;
    const name = formData.get('name') as string;
    const message = formData.get('message') as string;
    const website = formData.get('website') as string;
    return contactAction({ email, message, name, website: website || undefined });
  };

  const [states, action, isPending] = useActionState<
    {
      email?: string | string[];
      message?: string | string[];
      name?: string | string[];
      customerUserErrors?: CustomerUserError[];
      error?: string;
      success?: string;
    },
    FormData
  >(handleSubmit, {
    email: '',
    message: '',
    name: '',
  });

  useFormStatesEffect({
    states,
    userFeedback: {
      error: 'An error occurred while sending the email.',
      success: 'Email sent successfully',
    },
  });

  return (
    <form
      action={action}
      title="Contact Us"
      className="space-y-6 py-8 md:py-12 max-w-md mx-auto w-full px-4 md:px-6"
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          placeholder="name@company.com"
          required={true}
          disabled={isPending}
          aria-invalid={!!states.email?.at(-1)}
          aria-describedby={states.email?.at(-1) ? 'email-error' : undefined}
        />
        <FormFieldError error={states.email} fieldId="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          placeholder="Your name"
          name="name"
          id="name"
          required={true}
          disabled={isPending}
          aria-invalid={!!states.name?.at(-1)}
          aria-describedby={states.name?.at(-1) ? 'name-error' : undefined}
        />
        <FormFieldError error={states.name} fieldId="name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          placeholder="Your message"
          name="message"
          id="message"
          required={true}
          disabled={isPending}
          aria-invalid={!!states.message?.at(-1)}
          aria-describedby={states.message?.at(-1) ? 'message-error' : undefined}
        />
        <FormFieldError error={states.message} fieldId="message" />
      </div>
      <div className="hidden" aria-hidden="true">
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          disabled={isPending}
        />
      </div>
      <SubmitButton />
    </form>
  );
};

export default ContactForm;
