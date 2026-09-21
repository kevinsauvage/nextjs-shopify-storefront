# Next.js Shopify E-commerce

A modern, full-featured e-commerce application built with Next.js and Shopify Storefront API.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **React**: 19.2
- **Language**: TypeScript 5.9.3
- **E-commerce Backend**: [Shopify Storefront API](https://shopify.dev/api/storefront)
- **Styling**: Tailwind CSS 4.1.4, SCSS
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

- Node.js 20.9+ (recommended: 22+)
- npm or yarn
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
NEXT_PUBLIC_SHOPIFY_STOREFRONT_URL=https://your-store.myshopify.com/api/2025-01/graphql.json

# Required: canonical site URL
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Optional: Shopify Admin API (for admin operations)
SHOPIFY_STORE_FRONT_ADMIN_TOKEN=your_admin_access_token
SHOPIFY_ADMIN_URL=https://your-store.myshopify.com/admin/api/2025-01/graphql.json

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

### 4. Generate GraphQL types

Before running the application, you need to generate TypeScript types from your Shopify GraphQL schema:

```bash
npm run codegen
```

This command:

- Fetches the GraphQL schema from your Shopify store
- Generates TypeScript types and SDK functions
- Outputs to `src/shopify/storefront/index.ts`

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
- `npm run lint` - Run ESLint
- `npm run lint-fix` - Fix ESLint errors automatically
- `npm run lint-ts` - Type check with TypeScript
- `npm run type-check` - Alias for lint-ts
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
│   ├── cart/              # Shopping cart
│   ├── collections/       # Product collections
│   └── search/            # Product search
├── actions/               # Server actions
├── components/            # React components
│   └── ui/                # shadcn/ui components
├── contexts/              # React contexts (Cart, User)
├── shopify/               # Shopify GraphQL queries and SDK
│   ├── admin/            # Admin API queries
│   └── storefront/       # Storefront API queries
├── utils/                 # Utility functions
└── styles/                # Global styles
```

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

| Variable                             | Description                                 |
| ------------------------------------ | ------------------------------------------- |
| `SHOPIFY_STORE_FRONT_ACCESS_TOKEN`   | Shopify Storefront API access token         |
| `NEXT_PUBLIC_SHOPIFY_STOREFRONT_URL` | Shopify Storefront API GraphQL endpoint URL |
| `NEXT_PUBLIC_BASE_URL`               | Canonical site URL (metadata, sitemap, etc.) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Upstash for Redis creds; durable contact-form rate limiter |

These are validated at server startup by `src/config/env.ts`; the app fails fast if they are missing or malformed.

### Optional

| Variable                          | Description                                             |
| --------------------------------- | ------------------------------------------------------- |
| `SHOPIFY_STORE_FRONT_ADMIN_TOKEN` | Shopify Admin API access token (set with `SHOPIFY_ADMIN_URL`) |
| `SHOPIFY_ADMIN_URL`               | Shopify Admin API GraphQL endpoint URL                  |
| `SHOPIFY_SCOPE`                   | Comma-separated list of delegate token scopes           |
| `NEXT_PUBLIC_SITE_DOMAIN`         | Your site domain (for cookie settings)                  |
| `NEXT_PUBLIC_GTM_ID`              | Google Tag Manager container ID (format: `GTM-XXXXXXX`) |
| `EMAIL_ADDRESS` / `EMAIL_PASSWORD` | Sending mailbox used by the contact form                |
| `CONTACT_EMAIL`                   | Recipient of contact submissions (defaults to `EMAIL_ADDRESS`) |
| `ERROR_REPORTING_URL`             | Optional webhook that receives logged errors            |

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
- Verify `NEXT_PUBLIC_SITE_DOMAIN` is set correctly for production

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
