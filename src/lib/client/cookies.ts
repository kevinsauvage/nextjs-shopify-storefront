'use client';

/**
 * Client-side cookie utilities
 * Browser cookie manipulation helpers
 */

export const getCookieFront = (name: string) => {
  if (typeof document === 'undefined') return '';
  const cookies = document.cookie.split(';');

  for (const cooky of cookies) {
    const cookie = cooky.trim();
    if (cookie.startsWith(`${name}=`)) {
      return cookie.slice(Math.max(0, name.length + 1));
    }
  }

  return '';
};

export const setCookieFront = (
  cName: string,
  cValue: string,
  expDays: number = 1,
  sameSite: 'Lax' | 'Strict' | 'None' | undefined = 'Lax',
) => {
  if (typeof cName !== 'string' || typeof expDays !== 'number') {
    throw new TypeError('Invalid input parameters');
  }

  const date = new Date();
  date.setTime(date.getTime() + expDays * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;

  const isProduction = process.env.NODE_ENV === 'production';

  let cookie = `${cName}=${cValue}; ${expires}; path=/`;
  if (isProduction) {
    cookie += '; Secure';
  }
  if (sameSite) {
    cookie += `; SameSite=${sameSite}`;
  }

  try {
    if (typeof document !== 'undefined') {
      document.cookie = cookie;
    }
  } catch (error) {
    console.error(`Failed to set cookie: ${JSON.stringify(error, undefined, 2)}`);
  }
};
