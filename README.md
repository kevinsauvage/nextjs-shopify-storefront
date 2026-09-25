# Next.js Shopify E-commerce

A modern, full-featured e-commerce application built with Next.js and Shopify Storefront API.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **React**: 19.2
- **Language**: TypeScript 5.9.3
- **E-commerce Backend**: [Shopify Storefront API](https://shopify.dev/api/storefront)
- **Styling**: Tailwind CSS 4.1.18, SCSS
- **UI Components**: Radix UI, shadcn/ui
- **GraphQL**: graphql-request, GraphQL Code Generator
- **State Management**: React Context (Cart, User)
- **Form Handling**: Server Actions with Zod validation
- **Notifications**: Sonner (toast notifications)

## Features

- 🛍️ Product catalog with collections
- 🛒 Shopping cart with persistent storage
- 👤 User authentication and account management
- 📦 Order history and tracking
- ❤️ Wishlist functionality
- 🔍 Product search
- 📱 Responsive design
- 🌓 Dark mode support
- 🍪 Cookie consent management
- 📊 Google Tag Manager (GTM) integration

## Prerequisites

- Node.js 24.x (see `.nvmrc`)
- yarn 1.22.22 (`yarn`, never `npm`/`pnpm`/`bun`)
- Shopify store with Storefront API access
- Shopify Storefront API access token

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/kevinsauvage/nextjs-shopify-storefront.git
cd nextjs-shopify-storefront
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Required: Shopify Storefront API
SHOPIFY_STORE_FRONT_ACCESS_TOKEN=your_storefront_access_token
NEXT_PUBLIC_SHOPIFY_STOREFRONT_URL=https://your-store.myshopify.com/api/2026-07/graphql.json

# Required: canonical site URL
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Optional: Shopify Admin API (for admin operations)
SHOPIFY_STORE_FRONT_ADMIN_TOKEN=your_admin_access_token
SHOPIFY_ADMIN_URL=https://your-store.myshopify.com/admin/api/2026-07/graphql.json

# Optional: Delegate token scope (comma-separated)
SHOPIFY_SCOPE=unauthenticated_read_product_listings,unauthenticated_read_product_inventory

# Optional: Site configuration
NEXT_PUBLIC_SITE_DOMAIN=yourdomain.com

# Optional: Google Tag Manager (GTM)
# Note: GTM IDs start with "GTM-" (e.g., GTM-XXXXXXX)
# For GA4 directly, you would use a different integration
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX

# Standard Next.js
NODE_ENV=development
```

See `.env.example` for the complete, commented list (including the optional
`NEXT_PUBLIC_SITE_*` metadata variables).

### 4. Generate GraphQL types

Before running the application, you need to generate TypeScript types from your Shopify GraphQL schema:

```bash
npm run codegen
```

This command:

- Fetches the GraphQL schema from your Shopify store
- Generates TypeScript types and SDK functions
- Outputs to `src/shopify/storefront/index.ts` (and `src/shopify/admin/index.ts` when Admin credentials are set)

**Note**: The build script automatically runs codegen, but you should run it manually after:

- First setup
- When Shopify schema changes
- When GraphQL queries are modified

### 5. Run the development server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production (includes codegen)
- `npm run start` - Start production server
- `npm run analyze` - Analyze the production bundle
- `npm run lint` - Run ESLint
- `npm run lint-fix` - Fix ESLint errors automatically
- `npm run lint-ts` - Type check with TypeScript using `tsconfig.json`
- `npm run type-check` - Type check with TypeScript
- `npm run test` - Run the Vitest suite once
- `npm run test:watch` - Run Vitest in watch mode
- `npm run codegen` - Generate GraphQL types from Shopify schema
- `npm run codegen:watch` - Watch mode for codegen (auto-regenerate on changes)
- `npm run lint:css` - Lint CSS/SCSS files
- `npm run lint:css:fix` - Fix CSS/SCSS linting errors

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication routes
│   ├── (legal)/           # Legal pages (privacy, terms, etc.)
│   ├── account/           # User account pages
│   ├── api/               # Route handlers (e.g. predictive search)
│   ├── cart/              # Shopping cart
│   ├── collections/       # Product collections and product pages
│   └── search/            # Product search
├── actions/               # Server actions
├── components/            # React components
│   └── ui/                # shadcn/ui components
├── config/                # App config and env validation
├── contexts/              # React contexts (Cart, User)
├── data/                  # Static data (site metadata, SEO defaults)
├── hooks/                 # Reusable React hooks
├── lib/                   # Framework-agnostic server/client helpers
├── services/              # Business logic (cart, auth, addresses, users)
├── shopify/               # Shopify GraphQL queries and SDK
│   ├── admin/            # Admin API queries
│   └── storefront/       # Storefront API queries
├── styles/                # Global styles
├── types/                 # Ambient type declarations
└── utils/                 # Utility functions
```

## Shopify content (Pages)

Marketing pages (`/pages/<handle>`) are authored in Shopify Admin → Content → Pages
and rendered by `src/app/pages/[handle]/page.tsx` — no deploy needed to publish copy.

`bin/shopify-content.mjs` (Admin API, needs `SHOPIFY_ADMIN_URL` +
`SHOPIFY_STORE_FRONT_ADMIN_TOKEN`) manages them from the repo:

```bash
yarn content:list    # show all Shopify pages (handle, title, published)
yarn content:seed    # create/update every entry of content/pages.json and publish
node bin/shopify-content.mjs upsert --handle size-guide --title "Size guide" --file content/pages/size-guide.html [--draft]
node bin/shopify-content.mjs pull --handle faq [--file content/pages/faq.html]
```

Workflow for a new page: add the HTML file under `content/pages/`, register it in
`content/pages.json`, run `yarn content:seed`. Re-running seed updates the page in
place (safe to re-run). Internal links in the HTML should use storefront paths
(`/contact`, `/pages/size-guide`, …).

Sync is explicit both ways: edits made directly in Shopify Admin do **not** flow
back on their own — and the next seed would overwrite them. Run
`node bin/shopify-content.mjs pull --handle <handle>` first to bring Admin edits
into the repo (`--file` targets a path outside the manifest). Note `content/` is
Prettier-ignored on purpose: Shopify normalizes page HTML on save, so `pull` keeps
the files byte-identical to the store instead of reformatted.

## Shopify navigation (menus)

The header (`main-menu`) and footer (`footer`) are Shopify menus read via
`getMenuByHandle` — edit them declaratively instead of clicking through Admin.

```bash
yarn navigation:list              # show all menu handles
node bin/shopify-navigation.mjs show --handle footer
yarn navigation:sync              # create/update every menu in content/navigation.json
```

`sync` rewrites each listed menu wholesale (title + full item tree) and never
touches menus outside the manifest (e.g. the customer-account menu). Item URLs are
storefront paths (`/collections/sale`, `/pages/faq`); absolute myshopify URLs coming
back from Shopify are rewritten on-site by `normalizeMenuHref`.

> After `content:seed` / `navigation:sync`, storefront pages can show stale menus or
> content for up to 10 minutes: public Shopify reads are cached (`revalidate.shopify`
> in `src/config/index.ts`, tag `shopify`) and this repo has no purge webhook yet.

## Popular searches (metaobject)

The "Popular:" chips on `/search` come from a `popular_search_term` metaobject
(read by `src/lib/server/popularSearches.ts`), falling back to a static list when
the merchant has not curated any. Each entry needs a `term` field (a
`query`/`label`/`title` field also works); the definition must expose storefront
`PUBLIC_READ`.

```bash
yarn metaobjects:list             # show all metaobject definitions
yarn metaobjects:ensure           # create the popular_search_term definition if missing
yarn metaobjects:seed             # upsert terms from content/popular-searches.json
```

## Device-local state (no account, no server)

Two small client caches make browsing feel continuous without touching Shopify:

- **Recently viewed** — `src/lib/client/recentlyViewed.ts` records product GIDs on
  the product page (`RecentlyViewedTracker`) and renders them as a rail
  (`RecentlyViewedProducts`) on product and empty-cart pages.
- **Recent searches** — `src/lib/client/recentSearches.ts` records terms on the
  search page and shows them under the search box (`RecentSearches`).

Both are per-browser (`localStorage`), read hydration-safely via
`useLocalList`/`useSyncExternalStore`, and never sent to the server except as
product IDs to resolve. Clearing browser storage clears them.

## Wishlist (guest, merge, share, move to cart)

The wishlist is a `custom.wishlist` JSON metafield on the Shopify customer
(`WishlistService`), read through the Storefront API and written through the
optional Admin API. It is capped at `WISHLIST_MAX_ITEMS` (100). The wishlist
page (`/wishlist`, public — sibling of `/wishlist/shared`) renders for guests
too, from the device-local list. Signed-out shoppers build that list in
`localStorage` (`src/lib/client/guestWishlist.ts`); it is merged on login.

### Guest → login merge: **union, capped at 100**

`mergeWishlistIds` (`src/lib/wishlist.ts`) is the single implementation, with a
deliberate, documented strategy:

- **Union** — every valid id from either side is kept and de-duplicated; guest
  saves are never silently dropped.
- **Server order first** — the metafield list is seeded first, so a returning
  customer's existing order is preserved and server ids win on ties.
- **Guest ids appended** in their most-recent-first `localStorage` order.
- **Cap evicts guest ids, never server ids** — if the union exceeds 100, only
  guest ids are truncated, so an anonymous device can never push a customer's
  saved items out of the metafield.

The merge runs once, on the first sign-in (`UserContext`), under the same
per-customer lock as normal mutations. `WishlistService.mergeWishlist` re-reads
the metafield inside the lock and **skips the Admin write entirely when the
guest list adds nothing new**, so a plain re-login does not churn the metafield
or the cache tag. The device list is cleared only after the server merge
succeeds, so a transient failure retries on the next visit.

### Shared wishlist link

"Share" builds a read-only URL, `/wishlist/shared?ids=<gid,gid,…>`, carrying
only product ids — no customer data, no stored mapping.

- `createWishlistShareLinkAction` builds the absolute URL (prefers the native
  share sheet, falls back to the clipboard).
- `/wishlist/shared` validates every id with the same product-GID rule, resolves
  the products server-side through the public resolver, and is `noindex` +
  `robots.ts`-disallowed (user-generated, not a landing page).

### Move to cart

`moveWishlistToCartAction` resolves the first purchasable variant of each
selected product, **adds the lines to the cart first**, and only then removes
the moved products from the wishlist. If the cart write fails, the products
stay wishlisted instead of vanishing from both. Products with no purchasable
variant (sold out / deleted) are skipped, stay saved, and are reported in the
result message.

## GraphQL Code Generation

This project uses [GraphQL Code Generator](https://the-guild.dev/graphql/codegen) to generate TypeScript types and SDK functions from Shopify's GraphQL schema.

### Configuration

- **Storefront API**: `codegen.storefront.ts`
- **Admin API**: `codegen.admin.ts`

### Usage

1. **One-time generation**:

   ```bash
   npm run codegen
   ```

2. **Watch mode** (auto-regenerate on file changes):

   ```bash
   npm run codegen:watch
   ```

3. **Automatic on build**: The `build` script automatically runs codegen before building.

### Generated Files

- `src/shopify/storefront/index.ts` - Storefront API SDK and types
- `src/shopify/admin/index.ts` - Admin API SDK and types

## Environment Variables

### Required

| Variable                                              | Description                                                |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| `SHOPIFY_STORE_FRONT_ACCESS_TOKEN`                    | Shopify Storefront API access token                        |
| `NEXT_PUBLIC_SHOPIFY_STOREFRONT_URL`                  | Shopify Storefront API GraphQL endpoint URL                |
| `NEXT_PUBLIC_BASE_URL`                                | Canonical site URL (metadata, sitemap, etc.)               |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Upstash for Redis creds; durable contact-form rate limiter |

These are validated at server startup by `src/config/env.ts`; the app fails fast if they are missing or malformed.

### Optional

| Variable                           | Description                                                                                                                                                                                           |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SHOPIFY_STORE_FRONT_ADMIN_TOKEN`  | Shopify Admin API access token (set with `SHOPIFY_ADMIN_URL`)                                                                                                                                         |
| `SHOPIFY_ADMIN_URL`                | Shopify Admin API GraphQL endpoint URL                                                                                                                                                                |
| `SHOPIFY_SCOPE`                    | Comma-separated list of delegate token scopes                                                                                                                                                         |
| `NEXT_PUBLIC_SITE_DOMAIN`          | Cookie `Domain` attribute: a registrable parent such as `example.com` (or `www.example.com`). Leave empty on `*.vercel.app`/preview or `localhost` deployments so the session cookie stays host-only. |
| `NEXT_PUBLIC_GTM_ID`               | Google Tag Manager container ID (format: `GTM-XXXXXXX`)                                                                                                                                               |
| `EMAIL_ADDRESS` / `EMAIL_PASSWORD` | Sending mailbox used by the contact form                                                                                                                                                              |
| `CONTACT_EMAIL`                    | Recipient of contact submissions (defaults to `EMAIL_ADDRESS`)                                                                                                                                        |
| `ERROR_REPORTING_URL`              | Optional webhook that receives logged errors                                                                                                                                                          |
| `NEXT_PUBLIC_SITE_NAME`            | Company name used across SEO / Open Graph metadata                                                                                                                                                    |
| `NEXT_PUBLIC_SITE_EMAIL`           | Public contact email shown in metadata / structured data                                                                                                                                              |
| `NEXT_PUBLIC_SITE_PHONE`           | Public phone number                                                                                                                                                                                   |
| `NEXT_PUBLIC_SITE_LOGO`            | Absolute URL to the Open Graph logo image                                                                                                                                                             |
| `NEXT_PUBLIC_SITE_LOGO_SQUARE`     | Absolute URL to the square logo image                                                                                                                                                                 |
| `NEXT_PUBLIC_SITE_FACEBOOK`        | Facebook profile URL                                                                                                                                                                                  |
| `NEXT_PUBLIC_SITE_INSTAGRAM`       | Instagram profile URL                                                                                                                                                                                 |
| `NEXT_PUBLIC_SITE_TWITTER`         | Twitter/X profile URL                                                                                                                                                                                 |
| `NEXT_PUBLIC_SITE_TWITTER_HANDLE`  | Twitter/X handle (e.g. `@yourhandle`)                                                                                                                                                                 |
| `NEXT_PUBLIC_SITE_LINKEDIN`        | LinkedIn profile URL                                                                                                                                                                                  |
| `NEXT_PUBLIC_SITE_ABOUT_SHORT`     | Short company description used as a metadata fallback                                                                                                                                                 |

When unset, the `NEXT_PUBLIC_SITE_*` values fall back to the defaults in `src/data/siteMetadata.ts`.

## Deployment

### Build for Production

```bash
npm run build
```

The build process:

1. Runs GraphQL codegen to generate types
2. Builds the Next.js application
3. Optimizes assets and generates static pages

### Deploy to Vercel

1. Push your code to GitHub/GitLab/Bitbucket
2. Import your repository in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

Vercel will automatically:

- Detect Next.js
- Run the build command
- Deploy your application

### Deploy to Other Platforms

This is a standard Next.js application and can be deployed to any platform that supports Node.js:

- **Vercel** (recommended)
- **Netlify**
- **AWS Amplify**
- **Railway**
- **Render**
- **Self-hosted** (Docker, PM2, etc.)

### Environment Variables in Production

Make sure to set all required environment variables in your deployment platform's settings.

## Configuration

Application configuration is centralized in `src/config/index.ts` (routes, cookie names, pagination,
revalidation, site metadata). Environment variables are validated once at boot by `src/config/env.ts`
via the Next.js instrumentation hook (`src/instrumentation.ts`).

Key configuration includes:

- Route definitions and cookie names
- Pagination and cache revalidation windows
- Site metadata / SEO defaults
- Shopify API endpoints (from validated env vars)

## Development Notes

- The project uses Next.js App Router (not Pages Router)
- Server Actions are used for form submissions and data mutations
- GraphQL queries are defined in `.graphql` files in `src/shopify/`
- TypeScript types are generated from GraphQL schema
- Error boundaries are implemented for error handling
- Loading states are handled with `loading.tsx` files

## Troubleshooting

### Codegen fails

- Verify `SHOPIFY_STORE_FRONT_ACCESS_TOKEN` is set correctly
- Check that `NEXT_PUBLIC_SHOPIFY_STOREFRONT_URL` points to a valid Shopify GraphQL endpoint
- Ensure your Shopify store has Storefront API access enabled

### Build fails

- Run `npm run codegen` manually first
- Check that all required environment variables are set
- Verify TypeScript types are generated correctly

### Cart not persisting

- Check cookie settings in `src/config/index.ts`
- Verify `NEXT_PUBLIC_SITE_DOMAIN` is a registrable parent (`example.com`), not a `*.vercel.app` host; invalid values are now ignored automatically, but custom domains need it set correctly for cookies to be shared across subdomains

### Logged in, then redirected back to login on reload

- Almost always the session cookie being rejected: `NEXT_PUBLIC_SITE_DOMAIN` must be empty on `*.vercel.app`/preview hosts (a `Domain=` cookie on the deployment host is dropped by the browser). `getCookieDomain()` now filters these out and falls back to a host-only cookie.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run linting and type checking: `npm run lint && npm run lint-ts`
5. Submit a pull request

## License

[Add your license here]

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Shopify Storefront API](https://shopify.dev/api/storefront)
- [GraphQL Code Generator](https://the-guild.dev/graphql/codegen)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)
