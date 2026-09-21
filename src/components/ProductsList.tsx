import ListDisplay from '@/components/ListDisplay';
import type { ProductFieldsFragment } from '@/shopify/storefront';

import ProductCardDefault from './ProductCardDefault';

const ProductsList = ({
  products,
  layout = 'grid',
  loading,
}: {
  products: ProductFieldsFragment[];
  layout?: 'grid' | 'list';
  loading?: boolean;
}) => {
  const shouldRender = loading || (Array.isArray(products) && products.length > 0);

  if (!shouldRender) return null;

  return (
    <div className="mb-12">
      <ListDisplay layout={layout} loading={loading}>
        {(products ?? []).map((product, index) => (
          <li key={product.id}>
            <ProductCardDefault product={product} priority={index < 5} />
          </li>
        ))}
      </ListDisplay>
    </div>
  );
};

export default ProductsList;
