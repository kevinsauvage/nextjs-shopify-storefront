import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import CollectionGrid from '@/components/CollectionGrid/CollectionGrid';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import config from '@/config';
import seo from '@/data/seo';
import { generateMetadata as generateMetadataUtil } from '@/lib/server/metadata';
import { storefrontSdk } from '@/shopify/index';
import { CollectionSortKeys, ProductSortKeys } from '@/shopify/storefront/index';

import HomeSection from './_components/HomeSection';
import ProductSection from './_components/ProductSection';

import { ArrowRight, Award, RotateCcw, ShieldCheck, Sparkles, Star, Truck } from 'lucide-react';

export const revalidate = 3600; // 1 hour

export const metadata: Metadata = generateMetadataUtil({
  title: seo.home.title,
  description: seo.home.description,
  url: '/',
  absoluteTitle: true,
});

const perks = [
  { Icon: Truck, title: 'Free shipping', text: 'On all orders over $150' },
  { Icon: RotateCcw, title: 'Easy returns', text: '30-day hassle-free returns' },
  { Icon: ShieldCheck, title: 'Secure checkout', text: 'Encrypted payment flow' },
  { Icon: Award, title: 'Curated quality', text: 'Small-batch, vetted makers' },
];

const testimonials = [
  {
    quote:
      'The fit, the fabric, the packaging — everything feels considered. My go-to for elevated basics.',
    name: 'Maya R.',
    detail: 'Verified buyer · Linen Edit',
  },
  {
    quote:
      'Ordered Tuesday, wearing it Friday. Beautifully made and the returns policy made it risk-free.',
    name: 'Jonas K.',
    detail: 'Verified buyer · Outerwear',
  },
  {
    quote: 'Editorial taste without the markup. The collections read like a magazine you can shop.',
    name: 'Priya S.',
    detail: 'Verified buyer · New Season',
  },
];

const Home = async () => {
  const [collections, bestSelling, newArrival] = await Promise.all([
    storefrontSdk().collections({
      first: 100,
      firstProducts: 1,
      identifiers: [{ key: 'featured', namespace: 'custom' }],
      sortKey: CollectionSortKeys?.Relevance,
    }),
    storefrontSdk().getProducts({
      first: 8,
      identifiers: [],
      sortKey: ProductSortKeys.BestSelling,
    }),
    storefrontSdk().getProducts({
      first: 8,
      identifiers: [],
      sortKey: ProductSortKeys.CreatedAt,
    }),
  ]);

  const featuredCollections = collections.collections.edges.filter((collection) =>
    collection.node.metafields.find((metafield) => metafield?.key === 'featured'),
  );

  const bestSellingProducts = bestSelling.products.edges.map((edge) => edge.node);
  const newArrivalProducts = newArrival.products.edges.map((edge) => edge.node);
  const heroImage = featuredCollections[0]?.node.image;

  return (
    <div className="pb-16 md:pb-24">
      {/* Editorial hero */}
      <section className="hero-mesh relative overflow-hidden border-b border-border/60">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -top-28 right-[6%] size-96 rounded-full bg-[var(--gold)]/10 blur-3xl" />
          <div className="absolute -left-24 bottom-0 size-80 rounded-full bg-[var(--gold-soft)] blur-3xl" />
        </div>
        <div className="container relative mx-auto grid items-center gap-10 px-4 py-14 md:px-6 md:py-20 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <span className="text-eyebrow-gold animate-rise inline-flex items-center gap-3">
              <Sparkles size={14} aria-hidden="true" />
              New Season · Curated Drop
            </span>
            <h1 className="text-display animate-rise animate-rise-1 mt-5 max-w-2xl">
              Wear the story you want to tell.
            </h1>
            <p className="text-body-lg animate-rise animate-rise-2 mt-6 max-w-xl text-secondary">
              Discover the latest trends and exclusive collections that elevate everyday dressing —
              small-batch quality at an honest price, from wardrobe staples to statement pieces.
            </p>
            <div className="animate-rise animate-rise-3 mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" asChild className="rounded-full px-7">
                <Link href={config.routes.collection}>
                  Shop the collection
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="rounded-full px-7">
                <Link href="#new-arrivals">New arrivals</Link>
              </Button>
            </div>
            <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
              {[
                ['4.9', 'Average rating'],
                ['12k+', 'Happy customers'],
                ['30-day', 'Free returns'],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="sr-only">{label}</dt>
                  <dd className="font-display text-2xl font-semibold">{value}</dd>
                  <dd className="text-caption-sm uppercase tracking-widest text-secondary">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="lg:col-span-5">
            <div className="media-frame lift animate-rise animate-rise-2 relative aspect-[4/5] shadow-[0_32px_80px_-32px_rgb(12_10_9/0.45)]">
              {heroImage?.src ? (
                <Image
                  src={heroImage.src}
                  alt={
                    heroImage.altText || featuredCollections[0]?.node.title || 'Featured collection'
                  }
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--gold-soft)] via-muted to-background" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <Badge className="border-white/20 bg-white/15 text-white backdrop-blur-md">
                  Featured collection
                </Badge>
                <p className="font-display mt-3 text-2xl font-medium leading-tight">
                  {featuredCollections[0]?.node.title ?? 'The Autumn Edit'}
                </p>
                <Button size="sm" variant="secondary" asChild className="mt-4 rounded-full">
                  <Link href={config.routes.collection}>
                    Explore <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="relative border-t border-border/60 bg-background/60 py-3 backdrop-blur"
        >
          <div className="flex overflow-hidden">
            <div className="animate-marquee flex shrink-0 items-center gap-10 pr-10 text-[12px] font-semibold uppercase tracking-[0.18em] text-secondary">
              {[
                'Free shipping over $150',
                'New drop weekly',
                'Small-batch makers',
                '30-day returns',
                'Secure checkout',
                'Member perks',
              ]
                .concat([
                  'Free shipping over $150',
                  'New drop weekly',
                  'Small-batch makers',
                  '30-day returns',
                  'Secure checkout',
                  'Member perks',
                ])
                .map((item, index) => (
                  <span key={`${item}-${index}`} className="flex items-center gap-10">
                    {item} <Star size={12} className="text-[var(--gold)]" aria-hidden="true" />
                  </span>
                ))}
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 md:px-6">
        {/* Perks */}
        <div className="grid grid-cols-2 gap-3 py-10 md:grid-cols-4 md:gap-4 md:py-14">
          {perks.map(({ Icon, title, text }) => (
            <Card key={title} className="lift border-border/70 bg-card/80">
              <CardContent className="flex items-start gap-3 p-4 md:p-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--gold-soft)] text-[var(--gold)]">
                  <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-body-sm font-semibold">{title}</span>
                  <span className="block text-caption text-secondary">{text}</span>
                </span>
              </CardContent>
            </Card>
          ))}
        </div>

        {featuredCollections.length > 0 && (
          <HomeSection eyebrow="Curated" title="Explore our collections">
            <CollectionGrid collections={featuredCollections} />
          </HomeSection>
        )}
      </div>

      <div className="container mx-auto space-y-4 px-4 md:space-y-8 md:px-6">
        {bestSellingProducts.length > 0 && (
          <ProductSection
            eyebrow="Best Sellers"
            title="Featured Products"
            products={bestSellingProducts}
            viewAllLabel="View all featured"
          />
        )}

        {/* Social proof */}
        <section aria-label="Customer reviews" className="py-10 md:py-16">
          <div className="rounded-[var(--radius)] border border-border/70 bg-[var(--sidebar)] p-6 md:p-10">
            <span className="text-eyebrow-gold flex items-center gap-3">
              <span aria-hidden="true" className="h-px w-8 bg-[var(--gold)]/60" />
              Loved by customers
            </span>
            <h2 className="text-heading-2 mt-3 max-w-xl">Rated 4.9 by 12,000+ happy shoppers</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {testimonials.map(({ quote, name, detail }) => (
                <figure
                  key={name}
                  className="lift rounded-[var(--radius)] border border-border/70 bg-card p-6"
                >
                  <div className="flex gap-1 text-[var(--gold)]" aria-label="5 out of 5 stars">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} size={14} fill="currentColor" aria-hidden="true" />
                    ))}
                  </div>
                  <blockquote className="mt-4 text-body-sm leading-relaxed text-foreground">
                    “{quote}”
                  </blockquote>
                  <figcaption className="mt-4 text-caption text-secondary">
                    <span className="block font-semibold text-foreground">{name}</span>
                    {detail}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {newArrivalProducts.length > 0 && (
          <div id="new-arrivals" className="scroll-mt-24">
            <ProductSection
              eyebrow="Just In"
              title="New Arrivals"
              products={newArrivalProducts}
              viewAllLabel="View all new arrivals"
            />
          </div>
        )}

        {/* Closing CTA */}
        <section className="pb-4 pt-6">
          <div className="hero-mesh relative overflow-hidden rounded-[var(--radius)] border border-border/70 px-6 py-12 text-center md:py-16">
            <span className="text-eyebrow-gold justify-center inline-flex items-center gap-3">
              <span aria-hidden="true" className="h-px w-8 bg-[var(--gold)]/60" />
              Members get 10% off
              <span aria-hidden="true" className="h-px w-8 bg-[var(--gold)]/60" />
            </span>
            <h2 className="mx-auto mt-4 max-w-2xl text-balance">
              Join the list for early drops & private offers
            </h2>
            <p className="text-body mx-auto mt-3 max-w-xl text-secondary">
              One thoughtful email a week. No spam — unsubscribe anytime.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild className="rounded-full px-7">
                <Link href="/register">
                  Create an account <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="rounded-full px-7">
                <Link href={config.routes.collection}>Continue shopping</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
