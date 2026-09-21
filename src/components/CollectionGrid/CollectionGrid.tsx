import CollectionCard from '@/components/CollectionCard';
import type { CollectionsQuery } from '@/shopify/storefront';
import { cn } from '@/utils/cn';

/**
 * Editorial bento grid: the first collection becomes a large hero tile and the
 * rest flow into a responsive mosaic. Deterministic row heights keep the
 * layout stable as images load.
 */
const CollectionGrid = ({
  collections,
}: {
  collections: CollectionsQuery['collections']['edges'];
}) => {
  if (!Array.isArray(collections) || collections.length === 0) {
    return null;
  }

  return (
    <ul className="grid auto-rows-[160px] grid-cols-2 gap-3 sm:auto-rows-[200px] sm:gap-4 md:auto-rows-[240px] md:grid-cols-4 md:gap-5 lg:auto-rows-[280px] lg:gap-6">
      {collections.map((collection, index) => (
        <li
          key={collection.node.id || collection.node.title + index}
          className={cn('relative', index === 0 && 'col-span-2 row-span-2')}
        >
          <CollectionCard
            collection={collection.node}
            priority={index < 5}
            featured={index === 0}
          />
        </li>
      ))}
    </ul>
  );
};

export default CollectionGrid;
