import type { Metadata } from 'next';

import Breadcrumbs from '@/components/Breadcrumbs';
import PageBanner from '@/components/PageBanner';
import { Card, CardContent } from '@/components/ui/card';
import config from '@/config';
import seo from '@/data/seo';
import siteMetadata from '@/data/siteMetadata';
import { generateMetadata as generateMetadataUtil } from '@/lib/server/metadata';

import ContactForm from './_components/ContactForm';

import { Clock, Mail, MapPin, Phone } from 'lucide-react';

export const metadata: Metadata = generateMetadataUtil({
  title: seo.pages.contact.title,
  description: seo.pages.contact.description,
  url: config.routes.contact,
});

const ContactPage = () => {
  const { title, description } = seo.pages.contact || {};
  return (
    <div className="pb-16 md:pb-24">
      <PageBanner title={title} eyebrow="We're here to help" description={description}>
        <Breadcrumbs />
      </PageBanner>
      <div className="container mx-auto grid gap-6 px-4 pt-10 md:px-6 md:pt-14 lg:grid-cols-5">
        <Card className="h-fit border-border/70 lg:col-span-2">
          <CardContent className="space-y-5 p-6 md:p-8">
            <h2 className="text-heading-3">Contact details</h2>
            <ul className="space-y-4 text-body-sm text-secondary">
              <li className="flex items-start gap-3">
                <Mail size={17} className="mt-0.5 shrink-0 text-[var(--gold)]" aria-hidden="true" />
                <span>{siteMetadata.email}</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone
                  size={17}
                  className="mt-0.5 shrink-0 text-[var(--gold)]"
                  aria-hidden="true"
                />
                <span>{siteMetadata.phoneNumber}</span>
              </li>
              <li className="flex items-start gap-3">
                <Clock
                  size={17}
                  className="mt-0.5 shrink-0 text-[var(--gold)]"
                  aria-hidden="true"
                />
                <span>Mon–Fri, 9am–6pm CET · replies within 24h</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin
                  size={17}
                  className="mt-0.5 shrink-0 text-[var(--gold)]"
                  aria-hidden="true"
                />
                <span>Flagship studio — see shipping page for delivery zones</span>
              </li>
            </ul>
            <div aria-hidden="true" className="rule-gradient" />
            <p className="text-caption text-secondary">
              For orders, include your order number so we can help faster.
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70 lg:col-span-3">
          <CardContent className="p-6 md:p-8">
            <h2 className="text-heading-3">Send us a message</h2>
            <p className="text-body-sm mt-1 text-secondary">
              We read every note and reply within one business day.
            </p>
            <div className="[&_form]:mx-0 [&_form]:max-w-none [&_form]:px-0 [&_form]:py-6">
              <ContactForm />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContactPage;
