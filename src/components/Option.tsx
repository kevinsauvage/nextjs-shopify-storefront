import { Button } from '@/components/ui/button';
import type { ProductFieldsFragment } from '@/shopify/storefront';
import { cn } from '@/utils/cn';

type OptionValues = ProductFieldsFragment['options'][number]['optionValues'][number];

/**
 * A single product option. Renders colour swatches when Shopify provides a
 * swatch colour, otherwise labelled chips.
 */
const Option = ({
  option,
  onClick,
  isOptionOutOfStock,
  isOptionSelected,
}: {
  option: ProductFieldsFragment['options'][number];
  isOptionSelected?: (name: string, value: OptionValues) => boolean;
  isOptionOutOfStock: (id: string, optionValue: OptionValues) => boolean;
  onClick: (optionId: string, name: string, value: OptionValues) => void;
}) => {
  if (!Array.isArray(option.optionValues) || option.optionValues.length <= 1) {
    return null;
  }

  const selectedValue = option.optionValues.find((value) => isOptionSelected?.(option.name, value));

  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-2 flex items-baseline gap-2">
        <h3 className="text-label">{option.name}</h3>
        {selectedValue ? (
          <span className="text-caption-sm text-muted">{selectedValue.name}</span>
        ) : null}
      </div>
      <ul className="flex flex-wrap items-center gap-2.5">
        {option.optionValues.map((value) => {
          const isSelected = isOptionSelected?.(option.name, value) ?? false;
          const isOutOfStock = isOptionOutOfStock(option.name, value);
          const swatchColor = value.swatch?.color;

          if (swatchColor) {
            return (
              <li key={value.id}>
                <button
                  type="button"
                  disabled={isOutOfStock}
                  aria-label={`${option.name}: ${value.name}${isOutOfStock ? ' (out of stock)' : ''}`}
                  aria-pressed={isSelected}
                  title={value.name}
                  onClick={() => onClick(option.id, option.name, value)}
                  className={cn(
                    'relative flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    isSelected
                      ? 'border-foreground ring-1 ring-foreground ring-offset-2 ring-offset-background'
                      : 'border-border hover:border-foreground/60',
                    isOutOfStock && 'cursor-not-allowed opacity-40',
                  )}
                >
                  <span
                    className="h-6 w-6 rounded-full border border-black/10"
                    style={{ backgroundColor: swatchColor }}
                  />
                  {isOutOfStock ? (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute h-[1px] w-8 rotate-45 bg-foreground/70"
                    />
                  ) : null}
                </button>
              </li>
            );
          }

          return (
            <li key={value.id}>
              <Button
                disabled={isOutOfStock}
                variant={isOutOfStock ? 'destructive' : isSelected ? 'default' : 'outline'}
                type="button"
                size="sm"
                aria-pressed={isSelected}
                onClick={() => onClick(option.id, option.name, value)}
              >
                {value.name}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Option;
