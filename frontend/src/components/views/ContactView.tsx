'use client';

import { useTranslation } from 'react-i18next';
import { FaPhoneAlt, FaWhatsapp, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';
import PageHeader from '@/components/shared/PageHeader';
import Reveal from '@/components/shared/Reveal';
import EnquiryForm from '@/components/shared/EnquiryForm';

const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '919999999999';

export default function ContactView() {
  const { t } = useTranslation();

  const cards = [
    { Icon: FaPhoneAlt, label: t('contact.callUs'), value: '+91-99999-99999', href: 'tel:+919999999999' },
    { Icon: FaWhatsapp, label: t('contact.whatsapp'), value: 'Chat with us', href: `https://wa.me/${WHATSAPP}` },
    { Icon: FaEnvelope, label: t('contact.emailUs'), value: 'info@ayodhyatirtham.com', href: 'mailto:info@ayodhyatirtham.com' },
    { Icon: FaMapMarkerAlt, label: t('contact.address'), value: 'Ram Path, Ayodhya, UP 224123' },
  ];

  return (
    <>
      <PageHeader title={t('contact.title')} subtitle={t('contact.subtitle')} />
      <section className="section">
        <div className="container-px grid gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {cards.map(({ Icon, label, value, href }) => {
                const content = (
                  <div className="card flex h-full items-start gap-4 p-5 transition hover:border-primary">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-medium text-gray-400">{label}</p>
                      <p className="text-sm font-medium text-ink">{value}</p>
                    </div>
                  </div>
                );
                return (
                  <Reveal key={label}>
                    {href ? <a href={href} target="_blank" rel="noopener noreferrer">{content}</a> : content}
                  </Reveal>
                );
              })}
            </div>
            <Reveal>
              <iframe
                title="map"
                src="https://maps.google.com/maps?q=Ayodhya&z=12&output=embed"
                className="h-72 w-full rounded-2xl border-0"
                loading="lazy"
              />
            </Reveal>
          </div>

          <Reveal delay={0.1} className="card p-7">
            <h2 className="mb-5 font-heading text-xl font-semibold">{t('contact.send')}</h2>
            <EnquiryForm source="contact" />
          </Reveal>
        </div>
      </section>
    </>
  );
}
