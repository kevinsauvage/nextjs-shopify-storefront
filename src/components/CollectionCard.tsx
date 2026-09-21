import Image from 'next/image';
import Link from 'next/link';

import config from '@/config';
import type { CollectionsQuery } from '@/shopify/storefront';

import { ArrowRight } from 'lucide-react';

const CollectionCard = ({
  collection,
  priority = false,
}: {
  collection: CollectionsQuery['collections']['edges'][number]['node'];
  priority?: boolean;
}) => {
  const { title, image, handle } = collection || {};

  return (
    <Link
      href={`${config.routes.collection}/${handle}`}
      aria-label={`Shop ${title}`}
      className="group media-frame relative block h-full min-h-[300px] w-full"
    >
      {image?.src && (
        <Image
          src={image.src}
          alt={image.altText || title || 'Collection image'}
          fill
          quality={75}
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          blurDataURL={image?.blurDataURL}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 from-15% via-black/50 via-45% to-black/5 transition-opacity duration-300 group-hover:from-black/95" />

      <div className="absolute inset-0 flex flex-col justify-end gap-2 p-5 text-white [text-shadow:0_1px_16px_rgba(0,0,0,0.55)] md:p-6">
        <span className="text-eyebrow text-white/80">Collection</span>
        <h3 className="text-heading-3 font-semibold text-white">{title}</h3>
        <span className="mt-1 inline-flex items-center gap-2 text-body-sm font-medium text-white">
          Shop now
          <ArrowRight
            className="size-4 transition-transform duration-300 group-hover:translate-x-1"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
};

export default CollectionCard;
