import { notFound } from 'next/navigation';
import { LifetimeDeal } from '@gitroom/frontend/components/billing/lifetime.deal';
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
export const metadata: Metadata = {
  title: `PostVoice Lifetime deal`,
  description: '',
};
export default async function Page() {
  if (process.env.POSTVOICE_LIFETIME_ENABLED !== 'true') notFound();
  return <LifetimeDeal />;
}
