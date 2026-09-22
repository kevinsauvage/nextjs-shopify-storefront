import type { Metadata } from 'next';
import Link from 'next/link';

import { createAddressAction } from '@/actions/addressesActions';
import CardHeaderPattern from '@/components/CardHeaderPattern';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import config from '@/config';
import seo from '@/data/seo';
import { generateMetadata as generateMetadataUtil } from '@/lib/server/metadata';

import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = generateMetadataUtil({
  title: seo.account.addresses.title,
  description: seo.account.addresses.description,
  url: '/account/addresses/create',
  noindex: true, // Private page, don't index
});

import AddressFormUI from '../_components/AddressForm';

const CreateAddresses = () => {
  return (
    <Card>
      <CardHeaderPattern
        as="h2"
        title="Add address"
        size={3}
        descriptionClassName="max-w-md"
        description="Add a new shipping address to your account."
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href={config.routes.addresses} className="gap-2">
              <ArrowLeft size={16} />
              Back to addresses
            </Link>
          </Button>
        }
      />
      <CardContent>
        <AddressFormUI address={undefined} action={createAddressAction} buttonText="Add address" />
      </CardContent>
    </Card>
  );
};

export default CreateAddresses;
