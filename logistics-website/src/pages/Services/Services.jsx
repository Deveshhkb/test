import { FaClipboardList, FaTruckLoading, FaRoute, FaBoxOpen } from 'react-icons/fa';
import PageHeader from '../../components/PageHeader/PageHeader.jsx';
import SectionHeading from '../../components/SectionHeading/SectionHeading.jsx';
import ServiceCard from '../../components/ServiceCard/ServiceCard.jsx';
import CtaBand from '../../components/CtaBand/CtaBand.jsx';
import { services } from '../../data/services.js';
import styles from './Services.module.css';

const process = [
  { Icon: FaClipboardList, step: '01', title: 'Book & Quote', text: 'Request a quote online or by phone. We confirm pricing and pickup within two hours.' },
  { Icon: FaTruckLoading, step: '02', title: 'Collect & Load', text: 'Our team collects your cargo, handling it with care and full documentation.' },
  { Icon: FaRoute, step: '03', title: 'Transport & Track', text: 'Your shipment moves on optimised routes with real-time GPS visibility throughout.' },
  { Icon: FaBoxOpen, step: '04', title: 'Deliver & Confirm', text: 'We deliver on schedule and send instant electronic proof of delivery.' },
];

export default function Services() {
  return (
    <>
      <PageHeader
        title="Our Services"
        subtitle="Comprehensive, end-to-end logistics solutions designed around your supply chain."
        breadcrumb={['Services']}
      />

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="What We Offer"
            title="Logistics Solutions for Every Need"
            subtitle="Whether you ship across the city or across the ocean, we have a service built for you."
          />
          <div className={styles.grid}>
            {services.map((service, i) => (
              <ServiceCard key={service.id} service={service} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="section section--alt">
        <div className="container">
          <SectionHeading
            eyebrow="How It Works"
            title="A Simple, Transparent Process"
            subtitle="From quote to delivery, we make shipping effortless in four easy steps."
          />
          <div className={styles.processGrid}>
            {process.map((p) => (
              <div key={p.step} className={styles.processCard}>
                <span className={styles.processNum}>{p.step}</span>
                <span className={styles.processIcon} aria-hidden="true"><p.Icon /></span>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        title="Not sure which service fits?"
        text="Tell us about your cargo and our experts will recommend the most efficient, cost-effective option."
      />
    </>
  );
}
