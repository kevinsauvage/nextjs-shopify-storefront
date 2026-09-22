/**
 * Pure helpers behind product option selection. Kept framework-free so the
 * "impossible combination" rules can be unit-tested without rendering.
 */

export type SelectionOption = {
  name: string;
  value: string;
};

/** Option name -> selected value name. */
export type OptionSelection = Record<string, string>;

type VariantLike = {
  availableForSale: boolean;
  selectedOptions: ReadonlyArray<SelectionOption>;
};

/**
 * The variant matching the selection, or `undefined` when the combination does
 * not exist. Never falls back to an arbitrary variant: doing so silently priced
 * and added the wrong variant for combinations such as "Red / M" on a product
 * that only ships "Red / S" and "Blue / M".
 */
export const findVariantForSelection = <Variant extends VariantLike>(
  variants: ReadonlyArray<Variant>,
  selection: OptionSelection,
): Variant | undefined => {
  if (!variants.length) return undefined;
  if (!Object.keys(selection).length) return variants[0];

  return variants.find((variant) =>
    variant.selectedOptions.every((option) => selection[option.name] === option.value),
  );
};

/** True when the shopper picked a combination that does not exist. */
export const isSelectionUnavailable = <Variant extends VariantLike>(
  variants: ReadonlyArray<Variant>,
  selection: OptionSelection,
): boolean => Object.keys(selection).length > 0 && !findVariantForSelection(variants, selection);

/**
 * A value is out of stock when no purchasable variant pairs it with the rest of
 * the current selection. If the current selection is itself unsatisfiable, only
 * require that some purchasable variant offers the value — otherwise every
 * value would be disabled and the shopper could never recover.
 */
export const isOptionValueOutOfStock = <Variant extends VariantLike>(
  variants: ReadonlyArray<Variant>,
  selection: OptionSelection,
  name: string,
  valueName: string,
): boolean => {
  const prospective = { ...selection, [name]: valueName };
  const currentVariant = findVariantForSelection(variants, selection);

  return !variants.some((variant) => {
    if (!variant.availableForSale) return false;

    const offersValue = variant.selectedOptions.some(
      (option) => option.name === name && option.value === valueName,
    );
    if (!offersValue) return false;

    if (!currentVariant) return true;

    return variant.selectedOptions.every((option) => prospective[option.name] === option.value);
  });
};
