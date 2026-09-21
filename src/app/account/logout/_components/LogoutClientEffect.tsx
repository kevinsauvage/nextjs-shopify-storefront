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

  return <form ref={formReference} action={logoutAction} />;
};

export default LogoutClientEffect;
