import { Inter } from 'next/font/google';

import CookieBanner from '@/components/CookieBanner';
import Footer from '@/components/Footer';
import GtmScript from '@/components/GtmScript';
import Header from '@/components/Header';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import config from '@/config';
import { CartProvider } from '@/contexts/CartContext/CartContext';
import { UserProvider } from '@/contexts/UserContext/UserContext';
import { hasShopifySession } from '@/lib/server/shopify-helpers';
import { CartService } from '@/services/cart.service';
import { storefrontSdk } from '@/shopify';

import '../styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  preload: true,
  weight: ['400', '500', '600', '700'], // Body: 400-500, Headings: 600-700
});

const handleInitialCart = async () => {
  const cartId = await CartService.getCartId();
  return cartId ? CartService.getCart(cartId) : null;
};

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const [headerMenu, footerMenu, initialCart, isLoggedIn] = await Promise.all([
    storefrontSdk().getMenuByHandle({ handle: config.constants.menuHandles.main }),
    storefrontSdk().getMenuByHandle({ handle: config.constants.menuHandles.footer }),
    handleInitialCart(),
    hasShopifySession(),
  ]);

  return (
    <html
      lang="en"
      className={`${inter.variable} font-sans scroll-smooth antialiased`}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head>
        <link rel="preconnect" href="https://cdn.shopify.com" />
        <link rel="dns-prefetch" href="https://cdn.shopify.com" />
      </head>
      <body className="relative bg-background min-h-screen flex flex-col">
        <GtmScript />
        <CookieBanner />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CartProvider initialCart={initialCart}>
            <UserProvider isLoggedIn={isLoggedIn}>
              <Header headerMenu={headerMenu?.menu || null} isLoggedIn={isLoggedIn} />
              <main className="min-h-[calc(100vh-76px)]">{children}</main>
              <Toaster richColors />
              <Footer menuItems={footerMenu?.menu?.items} />
            </UserProvider>
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
