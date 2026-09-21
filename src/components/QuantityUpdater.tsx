'use client';

import { useCallback, useState } from 'react';

import SpinnerLoader from '@/components/SpinnerLoader';
import { getQuantityCap } from '@/utils/inventory';

import { Button } from './ui/button';

import { Minus, Plus } from 'lucide-react';

const QuantityUpdater = ({
  originalQuantity,
  quantityAvailable,
  productId,
  onChange,
  disabled,
}: {
  originalQuantity: number;
  quantityAvailable?: number | null;
  productId: string;
  disabled?: boolean;
  onChange:
    | ((_id: string, _quantity: number) => Promise<void>)
    | ((id: string, number_: number) => void);
}) => {
  const [quantity, setQuantity] = useState(originalQuantity);
  const [loading, setLoading] = useState(false);
  const quantityCap = getQuantityCap(quantityAvailable);

  const removeOne = useCallback(async () => {
    if (quantity <= 1) return;
    const newQuantity = quantity - 1;
    setQuantity(newQuantity);
    setLoading(true);
    try {
      await onChange(productId, newQuantity);
    } finally {
      setLoading(false);
    }
  }, [onChange, productId, quantity]);

  const addOne = useCallback(async () => {
    if (quantityCap !== undefined && quantity >= quantityCap) return;
    const newQuantity = quantity + 1;
    setQuantity(newQuantity);
    setLoading(true);
    try {
      await onChange(productId, newQuantity);
    } finally {
      setLoading(false);
    }
  }, [onChange, productId, quantity, quantityCap]);

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="icon"
        className="min-h-11 min-w-11 transition-all duration-200 hover:scale-110"
        onClick={() => {
          removeOne();
        }}
        disabled={loading || disabled || originalQuantity <= 1}
        aria-label="Decrease quantity"
      >
        {loading ? <SpinnerLoader size="sm" /> : <Minus className="h-3 w-3" />}
      </Button>
      <span className="w-8 text-center text-body-sm font-medium transition-all duration-200">
        {originalQuantity}
      </span>
      <Button
        variant="outline"
        size="icon"
        className="min-h-11 min-w-11 transition-all duration-200 hover:scale-110"
        onClick={() => {
          addOne();
        }}
        disabled={loading || disabled || (quantityCap !== undefined && originalQuantity >= quantityCap)}
        aria-label="Increase quantity"
      >
        {loading ? <SpinnerLoader size="sm" /> : <Plus className="h-3 w-3" />}
      </Button>
    </div>
  );
};

export default QuantityUpdater;
