'use server';

import { redirect } from 'next/navigation';

import config from '@/config';

export const searchAction = async (searchQuery: string) => {
  const query = searchQuery?.trim();

  if (!query) {
    redirect(config.routes.search);
  }

  redirect(`${config.routes.search}?${new URLSearchParams({ searchQuery: query }).toString()}`);
};

