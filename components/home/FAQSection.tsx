'use client';

import type { FAQ } from '@/types';
import SectionHeading from '@/components/ui/SectionHeading';
import Accordion from '@/components/ui/Accordion';

export default function FAQSection({ faqs }: { faqs: FAQ[] }) {
  return (
    <section id="faq" className="section">
      <div className="container max-w-3xl">
        <SectionHeading
          eyebrow="Good to Know"
          title="Frequently Asked Questions"
          subtitle="Everything you need to plan a smooth and soulful pilgrimage."
        />
        <Accordion items={faqs} />
      </div>
    </section>
  );
}
