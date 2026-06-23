import { FaBullseye, FaEye, FaCheckCircle, FaCertificate } from 'react-icons/fa';
import PageHeader from '../../components/PageHeader/PageHeader.jsx';
import SectionHeading from '../../components/SectionHeading/SectionHeading.jsx';
import TeamCard from '../../components/TeamCard/TeamCard.jsx';
import CtaBand from '../../components/CtaBand/CtaBand.jsx';
import { team, certifications } from '../../data/team.js';
import styles from './About.module.css';

const milestones = [
  { year: '2004', title: 'Founded in Long Beach', text: 'SwiftLane begins with five trucks and a commitment to dependable regional delivery.' },
  { year: '2010', title: 'National Expansion', text: 'Coast-to-coast road freight network launched, reaching every major US distribution hub.' },
  { year: '2015', title: 'Going Global', text: 'Air and sea freight divisions open, connecting clients to 200+ international destinations.' },
  { year: '2020', title: 'Smart Logistics', text: 'Real-time GPS tracking and our customer portal bring full shipment visibility online.' },
  { year: '2024', title: '20 Years Strong', text: 'A 1,450-vehicle fleet and 8M+ shipments delivered — and we are just getting started.' },
];

export default function About() {
  return (
    <>
      <PageHeader
        title="About SwiftLane"
        subtitle="Two decades of moving the world's cargo with precision, care and relentless reliability."
        breadcrumb={['About']}
      />

      {/* Introduction */}
      <section className="section">
        <div className="container">
          <div className={styles.introLayout}>
            <div className={styles.introMedia}>
              <img
                src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=900&q=80"
                alt="Fleet of SwiftLane trucks lined up at a distribution centre"
                loading="lazy"
                width="900"
                height="650"
              />
            </div>
            <div className={styles.introContent}>
              <SectionHeading
                align="left"
                eyebrow="Who We Are"
                title="Driven by Reliability, Powered by People"
              />
              <p>
                Founded in 2004, SwiftLane Logistics has grown from a small regional carrier into a
                trusted global transport partner. We move everything from single pallets to oversized
                project cargo — by road, air and sea — for more than 5,000 businesses worldwide.
              </p>
              <p>
                Our success is built on a simple promise: treat every shipment as if it were our own.
                That mindset, combined with a modern fleet and smart logistics technology, lets us
                deliver an industry-leading 99% on-time rate.
              </p>
              <ul className={styles.introList}>
                <li><FaCheckCircle aria-hidden="true" /> Dedicated account management</li>
                <li><FaCheckCircle aria-hidden="true" /> Real-time shipment visibility</li>
                <li><FaCheckCircle aria-hidden="true" /> Nationwide &amp; global coverage</li>
                <li><FaCheckCircle aria-hidden="true" /> Sustainable, fuel-efficient fleet</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="section section--alt">
        <div className="container">
          <div className={styles.mvGrid}>
            <article className={styles.mvCard}>
              <span className={styles.mvIcon} aria-hidden="true"><FaBullseye /></span>
              <h2>Our Mission</h2>
              <p>
                To empower businesses everywhere with logistics they can rely on — moving goods safely,
                swiftly and sustainably while delivering complete transparency at every step of the
                journey.
              </p>
            </article>
            <article className={styles.mvCard}>
              <span className={styles.mvIcon} aria-hidden="true"><FaEye /></span>
              <h2>Our Vision</h2>
              <p>
                To be the world's most trusted logistics partner — setting the standard for on-time
                performance, customer experience and environmentally responsible transport across
                every continent.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* History timeline */}
      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Our Journey"
            title="Two Decades of Growth"
            subtitle="From five trucks to a global network — the milestones that shaped SwiftLane."
          />
          <ol className={styles.timeline}>
            {milestones.map((m) => (
              <li key={m.year} className={styles.milestone}>
                <span className={styles.year}>{m.year}</span>
                <div className={styles.milestoneBody}>
                  <h3>{m.title}</h3>
                  <p>{m.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Team */}
      <section className="section section--alt">
        <div className="container">
          <SectionHeading
            eyebrow="Leadership"
            title="Meet the Team Behind SwiftLane"
            subtitle="Experienced logistics leaders dedicated to keeping your supply chain moving."
          />
          <div className={styles.teamGrid}>
            {team.map((member, i) => (
              <TeamCard key={member.id} member={member} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Accreditations"
            title="Certifications & Compliance"
            subtitle="Recognised standards that underpin our commitment to quality, safety and sustainability."
          />
          <div className={styles.certGrid}>
            {certifications.map((cert) => (
              <div key={cert.id} className={styles.cert}>
                <FaCertificate aria-hidden="true" />
                <span>{cert.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        title="Let's build a smarter supply chain together"
        text="Join thousands of businesses that trust SwiftLane to deliver — on time, every time."
      />
    </>
  );
}
