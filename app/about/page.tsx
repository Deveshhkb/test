import type { Metadata } from 'next';
import Image from 'next/image';
import { GiLotusFlower, GiTempleGate, GiPrayerBeads } from 'react-icons/gi';
import { FiTarget, FiEye } from 'react-icons/fi';
import PageHero from '@/components/ui/PageHero';
import SectionHeading from '@/components/ui/SectionHeading';
import StatsCounter from '@/components/home/StatsCounter';
import ContactCTA from '@/components/home/ContactCTA';
import { stats } from '@/lib/data/misc';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Learn about Ayodhya Tirtham — our mission, vision and the team devoted to crafting soulful pilgrimage journeys across India.',
  alternates: { canonical: '/about' },
};

const team = [
  { name: 'Acharya Devdutt Sharma', role: 'Founder & Spiritual Head', img: 'https://i.pravatar.cc/300?img=13' },
  { name: 'Anjali Mehta', role: 'Head of Pilgrim Experience', img: 'https://i.pravatar.cc/300?img=49' },
  { name: 'Vikram Singh', role: 'Director of Operations', img: 'https://i.pravatar.cc/300?img=15' },
  { name: 'Priya Nair', role: 'Lead Travel Curator', img: 'https://i.pravatar.cc/300?img=5' },
];

const milestones = [
  { year: '2008', text: 'Founded in Ayodhya with a single guided yatra.' },
  { year: '2014', text: 'Expanded to all major Char Dham circuits.' },
  { year: '2019', text: 'Crossed 100,000 happy pilgrims served.' },
  { year: '2024', text: 'Launched our premium digital pilgrimage platform.' },
];

const gallery = [
  'https://images.unsplash.com/photo-1604608672516-f1b9b1d37076?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1588096344356-9b02fafabb09?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=600&q=80',
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        title="About Ayodhya Tirtham"
        subtitle="Guiding seekers to the sacred heart of India for nearly two decades."
        crumbs={[{ label: 'About' }]}
        image="https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1920&q=80"
      />

      {/* Mission & Vision */}
      <section className="section">
        <div className="container grid gap-8 md:grid-cols-2">
          {[
            {
              icon: FiTarget,
              title: 'Our Mission',
              text: 'To make sacred pilgrimage accessible, comfortable and deeply meaningful for every devotee — blending timeless tradition with modern hospitality and seamless technology.',
            },
            {
              icon: FiEye,
              title: 'Our Vision',
              text: 'To be the most trusted spiritual tourism platform in the world, connecting millions of seekers with the divine heritage of India while uplifting local communities.',
            },
          ].map((b) => (
            <div key={b.title} className="rounded-3xl bg-gradient-to-br from-gold-50 to-white p-8 shadow-glass ring-1 ring-royal-900/5">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-saffron-500 to-gold-500 text-2xl text-white shadow-gold">
                <b.icon />
              </span>
              <h2 className="mt-5 text-2xl font-bold text-royal-950">{b.title}</h2>
              <p className="mt-3 leading-relaxed text-royal-900/70">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      <StatsCounter stats={stats} />

      {/* History timeline */}
      <section className="section">
        <div className="container max-w-3xl">
          <SectionHeading eyebrow="Our Journey" title="A Story of Devotion" />
          <div className="relative border-l-2 border-gold-200 pl-8">
            {milestones.map((m) => (
              <div key={m.year} className="relative mb-10 last:mb-0">
                <span className="absolute -left-[41px] grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-saffron-500 to-gold-500 text-xs font-bold text-white">
                  <GiLotusFlower />
                </span>
                <h3 className="font-display text-2xl font-bold text-gold-600">{m.year}</h3>
                <p className="mt-1 text-royal-900/70">{m.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="section bg-gradient-to-b from-gold-50 to-white">
        <div className="container">
          <SectionHeading eyebrow="The People" title="Meet Our Team" subtitle="Devoted experts dedicated to your spiritual journey." />
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((t) => (
              <div key={t.name} className="group overflow-hidden rounded-3xl bg-white text-center shadow-glass ring-1 ring-royal-900/5">
                <div className="relative h-64 overflow-hidden">
                  <Image src={t.img} alt={t.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition-transform duration-700 group-hover:scale-110" />
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-royal-950">{t.name}</h3>
                  <p className="text-sm text-gold-600">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values strip */}
      <section className="section">
        <div className="container grid gap-7 sm:grid-cols-3">
          {[
            { icon: GiTempleGate, title: 'Authenticity', text: 'Genuine rituals guided by qualified pandits.' },
            { icon: GiPrayerBeads, title: 'Devotion', text: 'Every journey crafted with heart and reverence.' },
            { icon: GiLotusFlower, title: 'Care', text: 'Comfort and safety for pilgrims of every age.' },
          ].map((v) => (
            <div key={v.title} className="rounded-3xl bg-gold-50 p-7 text-center">
              <v.icon className="mx-auto text-4xl text-gold-600" />
              <h3 className="mt-4 text-lg font-bold text-royal-950">{v.title}</h3>
              <p className="mt-2 text-sm text-royal-900/70">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Gallery */}
      <section className="section bg-gradient-to-b from-white to-gold-50">
        <div className="container">
          <SectionHeading eyebrow="Glimpses" title="Our Gallery" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {gallery.map((src, i) => (
              <div key={i} className="group relative aspect-square overflow-hidden rounded-2xl">
                <Image src={src} alt={`Gallery ${i + 1}`} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition-transform duration-700 group-hover:scale-110" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <ContactCTA />
    </>
  );
}
