 
import type { MetadataRoute } from 'next';

import { COOKIES } from './constants';

const config = {
  cookies: COOKIES,
  constants: {
    cookieExpiryDays: 182,
    delegateTokenExpirySeconds: 24 * 60 * 60, // 24 hours
    revalidate: {
      shopify: 600, // 10 minutes
    },
    pagination: {
      productsPerPage: 16,
    },
    menuHandles: {
      main: 'main-menu',
      footer: 'footer',
    },
    domains: {
      localhost: 'localhost',
    },
  },
  routes: {
    home: '/',
    cart: '/cart',
    login: '/login',
    collection: '/collections',
    contact: '/contact',
    account: '/account',
    addresses: '/account/addresses',
    updateAccount: '/account/update',
    wishlist: '/account/wishlist',
    createAddress: '/account/addresses/create',
    editAddress: '/account/addresses/edit',
    emailResetPassword: '/recover',
    logout: '/account/logout',
    orders: '/account/orders',
    privacy: '/privacy',
    refund: '/refund',
    register: '/register',
    search: '/search',
    shipping: '/shipping',
    terms: '/terms',
  },
};

export const accountNav = [
  { title: 'Account overview', url: config.routes.account },
  { title: 'My details', url: config.routes.updateAccount },
  { title: 'Address book', url: config.routes.addresses },
  { title: 'My orders', url: config.routes.orders },
  { title: 'My wishlist', url: config.routes.wishlist },
  { title: 'Sign out', url: config.routes.logout },
];

// Only public, indexable pages belong here. User-specific or auth pages
// (cart, account, login, wishlist, orders, ...) are excluded and disallowed in robots.ts.
export const sitemap: MetadataRoute.Sitemap = [
  {
    changeFrequency: 'daily',
    priority: 1,
    url: config.routes.home,
  },
  {
    changeFrequency: 'daily',
    priority: 0.8,
    url: config.routes.collection,
  },
  {
    changeFrequency: 'monthly',
    priority: 0.5,
    url: config.routes.contact,
  },
  {
    changeFrequency: 'monthly',
    priority: 0.3,
    url: config.routes.privacy,
  },
  {
    changeFrequency: 'monthly',
    priority: 0.3,
    url: config.routes.refund,
  },
  {
    changeFrequency: 'monthly',
    priority: 0.3,
    url: config.routes.shipping,
  },
  {
    changeFrequency: 'monthly',
    priority: 0.3,
    url: config.routes.terms,
  },
];

export default config;
