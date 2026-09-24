'use client';

import { useEffect, useState } from 'react';

import CardHeaderPattern from '@/components/CardHeaderPattern';
import FormFieldError from '@/components/FormFieldError';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import useCartContext from '@/contexts/CartContext/useCartContext';

import { Gift } from 'lucide-react';

const GIFT_WRAP_KEY = 'gift_wrap';

const OrderNoteForm = () => {
  const { cart, updateAttributes, updateNote } = useCartContext();
  const [note, setNote] = useState(cart?.note ?? '');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the field in sync with the server cart until the customer edits it,
  // so concurrent cart updates do not wipe a half-written note.
  useEffect(() => {
    if (!isDirty) {
      setNote(cart?.note ?? '');
    }
  }, [cart?.note, isDirty]);

  const giftWrapChecked =
    cart?.attributes?.some(
      (attribute) => attribute.key === GIFT_WRAP_KEY && attribute.value === 'true',
    ) ?? false;

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await updateNote(note.trim());
      setIsDirty(false);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to save order note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGiftWrapChange = async (checked: boolean | 'indeterminate') => {
    const next = checked === true;
    // Cart attributes carry nullable values; only defined strings round-trip.
    const others = (cart?.attributes ?? []).flatMap((attribute) =>
      attribute.key === GIFT_WRAP_KEY || typeof attribute.value !== 'string'
        ? []
        : [{ key: attribute.key, value: attribute.value }],
    );

    try {
      await updateAttributes(next ? [...others, { key: GIFT_WRAP_KEY, value: 'true' }] : others);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to update gift wrap');
    }
  };

  return (
    <Card>
      <CardHeaderPattern
        className="pb-4 md:pb-6"
        size={4}
        title={
          <span className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-secondary" />
            Order extras
          </span>
        }
        description="Add a note for your order or request gift wrapping."
      />
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="order-note">Order note</Label>
          <Textarea
            id="order-note"
            placeholder="Anything we should know? Delivery instructions, gift message…"
            value={note}
            rows={3}
            disabled={isSaving}
            onChange={(event) => {
              setNote(event.target.value);
              setIsDirty(true);
            }}
            aria-invalid={!!error?.at(-1)}
            aria-describedby={error?.at(-1) ? 'order-note-error' : undefined}
          />
          <FormFieldError error={error ?? undefined} fieldId="order-note" />
          <Button
            type="button"
            variant="secondary"
            loading={isSaving}
            onClick={() => {
              handleSave().catch(() => {
                // Errors surface inline via `error` state.
              });
            }}
          >
            Save note
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="gift-wrap"
            checked={giftWrapChecked}
            onCheckedChange={(checked) => {
              handleGiftWrapChange(checked).catch(() => {
                // Errors surface inline via `error` state.
              });
            }}
          />
          <Label htmlFor="gift-wrap" className="text-body-sm font-normal">
            Add gift wrapping
          </Label>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderNoteForm;
