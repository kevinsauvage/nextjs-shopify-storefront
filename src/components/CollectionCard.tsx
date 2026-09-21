import Image from 'next/image';
import Link from 'next/link';

import config from '@/config';
import type { CollectionsQuery } from '@/shopify/storefront';
import { cn } from '@/utils/cn';

import { ArrowRight } from 'lucide-react';

type CollectionNode = CollectionsQuery['collections']['edges'][number]['node'];

const CollectionCard = ({
  collection,
  priority = false,
  featured = false,
}: {
  collection: CollectionNode;
  priority?: boolean;
  featured?: boolean;
}) => {
  const { title, image, handle, description } = collection || {};

  return (
    <Link
      href={`${config.routes.collection}/${handle}`}
      aria-label={`Shop ${title}`}
      className="group media-frame relative block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {image?.src ? (
        <Image
          src={image.src}
          alt={image.altText || title || 'Collection image'}
          fill
          quality={80}
          priority={priority}
          sizes={
            featured
              ? '(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw'
              : '(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw'
          }
          placeholder={image.blurDataURL ? 'blur' : 'empty'}
          blurDataURL={image.blurDataURL || undefined}
          className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.05]"
        />
      ) : (
        <div className="h-full w-full bg-muted" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 from-10% via-black/35 via-50% to-black/5 transition-opacity duration-300 group-hover:from-black/90" />

      <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end gap-2 p-5 text-white [text-shadow:0_1px_16px_rgba(0,0,0,0.5)] md:p-6">
        <span className="text-eyebrow text-white/80">Collection</span>
        <h3
          className={cn(
            'font-semibold text-white',
            featured ? 'text-heading-2' : 'text-heading-3',
          )}
        >
          {title}
        </h3>
        {featured && description ? (
          <p className="mt-1 line-clamp-2 max-w-md text-body-sm text-white/85">{description}</p>
        ) : null}
        <span className="mt-1 inline-flex items-center gap-2 text-body-sm font-medium text-white">
          <span className="link-underline">Shop now</span>
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
