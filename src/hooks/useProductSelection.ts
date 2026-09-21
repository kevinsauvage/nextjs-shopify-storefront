'use client';

import { useCallback, useMemo, useState } from 'react';

import useCartContext from '@/contexts/CartContext/useCartContext';
import type { GetProductByHandleQuery, ProductFieldsFragment } from '@/shopify/storefront';

type Product = NonNullable<GetProductByHandleQuery['product']>;
type ProductVariant = Product['variants']['edges'][number]['node'];
type OptionValue = ProductFieldsFragment['options'][number]['optionValues'][number];

/** Option name -> selected value name. */
type OptionSelection = Record<string, string>;

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

  const variants = useMemo(
    () => product?.variants.edges.map((edge) => edge.node) ?? [],
    [product],
  );

  const selectedVariant = useMemo<ProductVariant | undefined>(() => {
    if (!Object.keys(selection).length) return variants[0];

    return (
      variants.find((variant) =>
        variant.selectedOptions.every((option) => selection[option.name] === option.value),
      ) ?? variants[0]
    );
  }, [selection, variants]);

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
      !variants.some((variant) =>
        variant.selectedOptions.some(
          (option) => option.name === name && option.value === value?.name,
        ),
      ),
    [variants],
  );

  const totalPrice = useMemo(() => {
    const amount = selectedVariant?.price?.amount;
    return amount ? Number((Number(amount) * quantity).toFixed(2)) : 0;
  }, [quantity, selectedVariant]);

  const handleAddToCart = useCallback(() => {
    if (!selectedVariant?.id) return;

    handleAddToCartContext(String(selectedVariant.id), quantity).catch((error) => {
      console.error('Error adding to cart:', error);
    });
  }, [handleAddToCartContext, quantity, selectedVariant]);

  return {
    handleAddToCart,
    handleChangeInput,
    handleSetSelectedProductOption,
    isOptionOutOfStock,
    isOptionSelected,
    quantity,
    selectedVariant,
    totalPrice,
  };
};

export type ProductSelection = ReturnType<typeof useProductSelection>;

export default useProductSelection;
