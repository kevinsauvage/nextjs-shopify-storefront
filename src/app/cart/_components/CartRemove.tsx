'use client';

import { useState } from 'react';

import SpinnerLoader from '@/components/SpinnerLoader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import useCartContext from '@/contexts/CartContext/useCartContext';

import { Trash2 } from 'lucide-react';

const CartRemove = ({ id, productTitle }: { id: string; productTitle?: string }) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { removeFromCart } = useCartContext();

  const handleRemove = async () => {
    if (!id) return console.error('Missing line item to delete');
    setLoading(true);
    try {
      await removeFromCart(id);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={loading}
                aria-label="Remove item from cart"
                className="text-secondary hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Remove item</span>
              </Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Remove from cart</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-heading-3">Remove item from cart?</AlertDialogTitle>
          <AlertDialogDescription className="text-body-sm text-secondary">
            {productTitle
              ? `Are you sure you want to remove "${productTitle}" from your cart? This action cannot be undone.`
              : 'Are you sure you want to remove this item from your cart? This action cannot be undone.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemove}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <SpinnerLoader size="sm" />
                Removing...
              </span>
            ) : (
              'Remove'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CartRemove;
