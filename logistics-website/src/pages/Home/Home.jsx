import { Link } from 'react-router-dom';
import {
  FaArrowRight,
  FaPhoneAlt,
  FaShippingFast,
  FaShieldAlt,
  FaHeadset,
  FaGlobeAmericas,
  FaDollarSign,
  FaLeaf,
  FaCheckCircle,
} from 'react-icons/fa';

import Button from '../../components/Button/Button.jsx';
import SectionHeading from '../../components/SectionHeading/SectionHeading.jsx';
import ServiceCard from '../../components/ServiceCard/ServiceCard.jsx';
import FleetCard from '../../components/FleetCard/FleetCard.jsx';
import TestimonialCard from '../../components/TestimonialCard/TestimonialCard.jsx';
import FaqAccordion from '../../components/FaqAccordion/FaqAccordion.jsx';
import StatsCounter from '../../components/StatsCounter/StatsCounter.jsx';
import CtaBand from '../../components/CtaBand/CtaBand.jsx';

import { services } from '../../data/services.js';
import { fleet } from '../../data/fleet.js';
import { testimonials } from '../../data/testimonials.js';
import { faqs } from '../../data/faqs.js';
import { stats } from '../../data/stats.js';

import styles from './Home.module.css';

const reasons = [
  { Icon: FaShippingFast, title: 'On-Time Delivery', text: '99% of shipments arrive on or ahead of schedule, backed by live route optimisation.' },
  { Icon: FaShieldAlt, title: 'Secure & Insured', text: 'Every consignment is handled with care and protected by comprehensive cargo coverage.' },
  { Icon: FaHeadset, title: '24/7 Support', text: 'Our dispatch and support teams are available around the clock, every day of the year.' },
  { Icon: FaGlobeAmericas, title: 'Global Network', text: 'Reach 200+ destinations through our trusted road, air and sea freight partnerships.' },
  { Icon: FaDollarSign, title: 'Transparent Pricing', text: 'No hidden fees — clear, competitive quotes delivered within two business hours.' },
  { Icon: FaLeaf, title: 'Greener Logistics', text: 'A modern, fuel-efficient fleet and carbon-aware routing for a lower footprint.' },
];

export default function Home() {
  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay} aria-hidden="true" />
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroContent}>
            <span className={styles.heroBadge}>
              <FaCheckCircle aria-hidden="true" /> Trusted by 5,000+ businesses worldwide
            </span>
            <h1 className={styles.heroTitle}>
              Reliable Logistics, <span className={styles.heroAccent}>Delivered On Time</span>, Every
              Time
            </h1>
            <p className={styles.heroSubtitle}>
              From road and air to sea freight and warehousing, SwiftLane moves your cargo across the
              globe with speed, security and real-time visibility at every mile.
            </p>
            <div className={styles.heroActions}>
              <Button to="/services" size="lg" icon={FaArrowRight} iconRight>
                Explore Services
              </Button>
              <Button to="/contact" size="lg" variant="ghost" icon={FaPhoneAlt}>
                Contact Us
              </Button>
            </div>

            <ul className={styles.heroStats}>
              <li>
                <strong>1,450+</strong>
                <span>Fleet Vehicles</span>
              </li>
              <li>
                <strong>200+</strong>
                <span>Destinations</span>
              </li>
              <li>
                <strong>99%</strong>
                <span>On-Time Rate</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- SERVICES ---------- */}
      <section className="section" aria-labelledby="services-heading">
        <div className="container">
          <SectionHeading
            eyebrow="What We Do"
            title="Comprehensive Logistics Services"
            subtitle="End-to-end supply chain solutions tailored to keep your business moving — by road, air and sea."
          />
          <div className={styles.servicesGrid}>
            {services.map((service, i) => (
              <ServiceCard key={service.id} service={service} index={i} />
            ))}
          </div>
          <div className={styles.centerAction}>
            <Button to="/services" variant="outline" icon={FaArrowRight} iconRight>
              View All Services
            </Button>
          </div>
        </div>
      </section>

      {/* ---------- WHY CHOOSE US ---------- */}
      <section className="section section--alt" aria-labelledby="why-heading">
        <div className="container">
          <div className={styles.whyLayout}>
            <div className={styles.whyMedia}>
              <img
                src="https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=900&q=80"
                alt="Logistics team coordinating shipments in a modern warehouse"
                loading="lazy"
                width="900"
                height="700"
              />
              <div className={styles.whyBadge}>
                <strong>20+</strong>
                <span>Years of Experience</span>
              </div>
            </div>

            <div className={styles.whyContent}>
              <SectionHeading
                align="left"
                eyebrow="Why Choose Us"
                title="Your Trusted Partner in Global Transport"
                subtitle="We combine cutting-edge technology with decades of logistics expertise to deliver dependable results."
              />
              <div className={styles.reasonsGrid}>
                {reasons.map(({ Icon, title, text }) => (
                  <div key={title} className={styles.reason}>
                    <span className={styles.reasonIcon} aria-hidden="true">
                      <Icon />
                    </span>
                    <div>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- STATS COUNTER ---------- */}
      <section className={styles.statsSection} aria-label="Company statistics">
        <div className={styles.statsOverlay} aria-hidden="true" />
        <div className="container">
          <StatsCounter stats={stats} />
        </div>
      </section>

      {/* ---------- FLEET SHOWCASE ---------- */}
      <section className="section" aria-labelledby="fleet-heading">
        <div className="container">
          <SectionHeading
            eyebrow="Our Fleet"
            title="A Modern Fleet for Every Load"
            subtitle="From agile delivery vans to heavy-haul tractors, our well-maintained vehicles are ready for any cargo."
          />
          <div className={styles.fleetGrid}>
            {fleet.slice(0, 3).map((vehicle, i) => (
              <FleetCard key={vehicle.id} vehicle={vehicle} index={i} />
            ))}
          </div>
          <div className={styles.centerAction}>
            <Button to="/fleet" variant="outline" icon={FaArrowRight} iconRight>
              Explore Our Fleet
            </Button>
          </div>
        </div>
      </section>

      {/* ---------- TESTIMONIALS ---------- */}
      <section className="section section--alt" aria-labelledby="testimonials-heading">
        <div className="container">
          <SectionHeading
            eyebrow="Testimonials"
            title="What Our Clients Say"
            subtitle="Thousands of businesses rely on SwiftLane to keep their supply chains running smoothly."
          />
          <div className={styles.testimonialGrid}>
            {testimonials.map((t) => (
              <TestimonialCard key={t.id} testimonial={t} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="section" aria-labelledby="faq-heading">
        <div className="container">
          <SectionHeading
            eyebrow="FAQ"
            title="Frequently Asked Questions"
            subtitle="Everything you need to know about shipping, tracking and working with SwiftLane."
          />
          <FaqAccordion items={faqs} />
          <p className={styles.faqFoot}>
            Still have questions? <Link to="/contact">Get in touch with our team →</Link>
          </p>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <CtaBand />
    </>
  );
}
