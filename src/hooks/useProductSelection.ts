'use client';

import { useCallback, useMemo, useState } from 'react';

import useCartContext from '@/contexts/CartContext/useCartContext';
import type { GetProductByHandleQuery, ProductFieldsFragment } from '@/shopify/storefront';
import {
  findVariantForSelection,
  isOptionValueOutOfStock,
  isSelectionUnavailable as getIsSelectionUnavailable,
  type OptionSelection,
} from '@/utils/productSelection';

type Product = NonNullable<GetProductByHandleQuery['product']>;
export type ProductVariant = Product['variants']['edges'][number]['node'];
type OptionValue = ProductFieldsFragment['options'][number]['optionValues'][number];

const getInitialSelection = (product: Product | null | undefined): OptionSelection => {
  const variant = product?.variants.edges[0]?.node;
  if (!variant) return {};

  return variant.selectedOptions.reduce<OptionSelection>(
    (selection, option) => ({ ...selection, [option.name]: option.value }),
    {},
  );
};

/**
 * Owns the selected variant, quantity and derived price for a product. All
 * state is derived from a single option selection map — no timers or side
 * effects inside state updaters.
 */
const useProductSelection = ({
  product,
}: {
  product: GetProductByHandleQuery['product'] | null | undefined;
}) => {
  const { handleAddToCart: handleAddToCartContext } = useCartContext();
  const [selection, setSelection] = useState<OptionSelection>(() => getInitialSelection(product));
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  const variants = useMemo(() => product?.variants.edges.map((edge) => edge.node) ?? [], [product]);

  const selectedVariant = useMemo<ProductVariant | undefined>(
    () => findVariantForSelection(variants, selection),
    [selection, variants],
  );

  const isSelectionUnavailable = useMemo(
    () => getIsSelectionUnavailable(variants, selection),
    [selection, variants],
  );

  const handleChangeInput = useCallback((nextQuantity: number) => {
    setQuantity(Math.max(1, nextQuantity));
  }, []);

  const handleSetSelectedProductOption = useCallback(
    (_id: string, name: string, value: OptionValue) => {
      setSelection((previous) => ({ ...previous, [name]: value.name }));
    },
    [],
  );

  const isOptionSelected = useCallback(
    (name: string, value: OptionValue) => selection[name] === value.name,
    [selection],
  );

  const isOptionOutOfStock = useCallback(
    (name: string, value: OptionValue) =>
      isOptionValueOutOfStock(variants, selection, name, value?.name),
    [selection, variants],
  );

  const totalPrice = useMemo(() => {
    const amount = selectedVariant?.price?.amount;
    return amount ? Number((Number(amount) * quantity).toFixed(2)) : 0;
  }, [quantity, selectedVariant]);

  const handleAddToCart = useCallback(() => {
    if (!selectedVariant?.id || isAdding) return;

    setIsAdding(true);
    handleAddToCartContext(String(selectedVariant.id), quantity).finally(() => {
      setIsAdding(false);
    });
  }, [handleAddToCartContext, isAdding, quantity, selectedVariant]);

  return {
    handleAddToCart,
    handleChangeInput,
    handleSetSelectedProductOption,
    isAdding,
    isOptionOutOfStock,
    isOptionSelected,
    isSelectionUnavailable,
    quantity,
    selectedVariant,
    totalPrice,
  };
};

export default useProductSelection;
