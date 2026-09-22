const siteMetadata = {
  about: {
    short:
      process.env.NEXT_PUBLIC_SITE_ABOUT_SHORT ||
      'CRISP is a fashion brand made for unisex use with an irreverent style. It started with jewelry, but has scaled up to something bigger and the reason for that is that we are fashion lovers.Our goal is to give you the best quality at an affordable price.',
  },
  companyName:
    process.env.NEXT_PUBLIC_SITE_NAME ||
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/^https?:\/\//, '').split('/')[0] ||
    'Example',
  email: process.env.NEXT_PUBLIC_SITE_EMAIL || 'yourName@example.com',
  facebook: process.env.NEXT_PUBLIC_SITE_FACEBOOK || 'https://www.facebook.com/example.page',
  instagram: process.env.NEXT_PUBLIC_SITE_INSTAGRAM || 'https://www.instagram.com/example.page',
  linkedin: process.env.NEXT_PUBLIC_SITE_LINKEDIN || 'https://www.linkedin.com/in/example.page',
  phoneNumber: process.env.NEXT_PUBLIC_SITE_PHONE || '(xxx) xxx-xxxx',
  siteLogo:
    process.env.NEXT_PUBLIC_SITE_LOGO ||
    `${process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com'}/images/logo.png`,
  siteLogoSquare:
    process.env.NEXT_PUBLIC_SITE_LOGO_SQUARE ||
    `${process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com'}/images/logox200.png`,
  siteUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com',
  twitter: process.env.NEXT_PUBLIC_SITE_TWITTER || 'https://twitter.com/example.page',
  twitterHandle: process.env.NEXT_PUBLIC_SITE_TWITTER_HANDLE || '@example',
};

export default siteMetadata;
