import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';

import CookieBanner from '@/components/CookieBanner';
import Footer from '@/components/Footer';
import GtmScript from '@/components/GtmScript';
import Header from '@/components/Header';
import JsonLd from '@/components/JsonLd';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import config from '@/config';
import { CartProvider } from '@/contexts/CartContext/CartContext';
import { UserProvider } from '@/contexts/UserContext/UserContext';
import siteMetadata from '@/data/siteMetadata';
import { getBaseUrl } from '@/lib/server/metadata';
import { organizationJsonLd, websiteJsonLd } from '@/lib/server/structured-data';
import { storefrontSdk } from '@/shopify';

import '../styles/globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: `${siteMetadata.companyName} — Online Store`,
    template: `%s | ${siteMetadata.companyName}`,
  },
  description: siteMetadata.about.short,
  applicationName: siteMetadata.companyName,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: siteMetadata.companyName,
    title: siteMetadata.companyName,
    description: siteMetadata.about.short,
    url: '/',
    images: [
      {
        url: siteMetadata.siteLogo,
        width: 1200,
        height: 630,
        alt: siteMetadata.companyName,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    creator: siteMetadata.twitterHandle,
    title: siteMetadata.companyName,
    description: siteMetadata.about.short,
    images: [siteMetadata.siteLogo],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: siteMetadata.siteLogoSquare,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0a09' },
  ],
};

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  preload: true,
  weight: ['400', '500', '600', '700'], // Body: 400-500, Headings: 600-700
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  preload: true,
  weight: ['400', '500', '600', '700'], // Editorial display serif
});

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const [headerMenu, footerMenu] = await Promise.all([
    storefrontSdk().getMenuByHandle({ handle: config.constants.menuHandles.main }),
    storefrontSdk().getMenuByHandle({ handle: config.constants.menuHandles.footer }),
  ]);

  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} font-sans scroll-smooth antialiased`}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head>
        <link rel="preconnect" href="https://cdn.shopify.com" />
        <link rel="dns-prefetch" href="https://cdn.shopify.com" />
      </head>
      <body className="relative bg-background min-h-screen flex flex-col">
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        <GtmScript />
        <CookieBanner />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CartProvider>
            <UserProvider>
              <Header headerMenu={headerMenu?.menu || null} />
              <main className="min-h-[calc(100vh-64px)] md:min-h-[calc(100vh-80px)]">
                {children}
              </main>
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
