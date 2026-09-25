import seo from './seo';

import { describe, expect, it } from 'vitest';

describe('seo', () => {
  it('exposes the home, cart and search entries', () => {
    expect(seo.home.title).toBe('Curated Fashion, Jewelry & Accessories');
    expect(seo.home.description).toContain('curated collection');
    expect(seo.cart.title).toBe('Cart');
    expect(seo.search.title).toBe('Search');
    expect(seo.wishlist.title).toBe('Wishlist');
  });

  it('exposes the account section entries', () => {
    expect(seo.account.title).toBe('My account');
    expect(seo.account.orders.title).toBe('My orders');
    expect(seo.account.addresses.title).toBe('My addresses');
    expect(seo.account.update.title).toBe('My details');
    expect(seo.account.logout.title).toBe('Sign out');
  });

  it('exposes the auth entries', () => {
    expect(seo.login.title).toBe('Login');
    expect(seo.register.title).toBe('Registration');
    expect(seo.recover.title).toBe('Password recovery');
    expect(seo.reset.title).toBe('Reset Password');
  });

  it('exposes the static policy pages', () => {
    expect(seo.pages.contact.title).toBe('Contact');
    expect(seo.pages.privacy.title).toBe('Privacy');
    expect(seo.pages.refund.title).toBe('Refund');
    expect(seo.pages.shipping.title).toBe('Shipping');
    expect(seo.pages.terms.title).toBe('Terms and Conditions');
  });

  it('gives every section a non-empty title and description', () => {
    const sections: Array<{ title?: unknown; description?: unknown }> = [
      seo.account,
      seo.account.addresses,
      seo.account.orders,
      seo.account.update,
      seo.cart,
      seo.home,
      seo.login,
      seo.pages.contact,
      seo.pages.privacy,
      seo.pages.refund,
      seo.pages.shipping,
      seo.pages.terms,
      seo.recover,
      seo.register,
      seo.reset,
      seo.search,
      seo.wishlist,
    ];

    for (const section of sections) {
      expect(typeof section.title).toBe('string');
      expect((section.title as string).length).toBeGreaterThan(0);
      expect(typeof section.description).toBe('string');
      expect((section.description as string).length).toBeGreaterThan(0);
    }
  });
});
