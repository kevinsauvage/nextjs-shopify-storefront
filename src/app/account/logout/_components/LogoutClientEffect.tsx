'use client';

import { useEffect, useRef } from 'react';

import { logoutAction } from '@/actions/authActions';

/**
 * Submits the logout server action on mount. Using a form action lets Next.js
 * handle the redirect from the server action natively.
 */
const LogoutClientEffect = () => {
  const formReference = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formReference.current?.requestSubmit();
  }, []);

  // The effect auto-submits for JS users; the `<noscript>` button keeps the
  // logout usable with JS disabled.
  return (
    <form ref={formReference} action={logoutAction}>
      <noscript>
        <button type="submit">Log out</button>
      </noscript>
    </form>
  );
};

export default LogoutClientEffect;
