import { buildMetadata } from '@/lib/seo';
import ContactView from '@/components/views/ContactView';

export const metadata = buildMetadata({
  title: 'Contact Us',
  description: 'Get in touch with Ayodhya Tirtham to plan your pilgrimage. Call, WhatsApp or send an enquiry.',
  path: '/contact',
});

export default function Page() {
  return <ContactView />;
}
