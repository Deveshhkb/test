import { FaSatelliteDish, FaBell, FaShieldAlt } from 'react-icons/fa';
import PageHeader from '../../components/PageHeader/PageHeader.jsx';
import SectionHeading from '../../components/SectionHeading/SectionHeading.jsx';
import TrackingForm from '../../components/TrackingForm/TrackingForm.jsx';
import styles from './Tracking.module.css';

const features = [
  { Icon: FaSatelliteDish, title: 'Live GPS Updates', text: 'See your shipment move in real time with location updates every step of the way.' },
  { Icon: FaBell, title: 'Milestone Alerts', text: 'Get notified the moment your cargo is picked up, in transit, and delivered.' },
  { Icon: FaShieldAlt, title: 'Secure Portal', text: 'Your shipment data is encrypted and accessible only to authorised users.' },
];

export default function Tracking() {
  return (
    <>
      <PageHeader
        title="Track Your Shipment"
        subtitle="Enter your tracking ID for real-time status, location and estimated delivery."
        breadcrumb={['Tracking']}
      />

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Real-Time Visibility"
            title="Where's My Shipment?"
            subtitle="Track any consignment instantly. No login required — just your tracking ID."
          />
          <TrackingForm />
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <div className={styles.features}>
            {features.map(({ Icon, title, text }) => (
              <div key={title} className={styles.feature}>
                <span className={styles.icon} aria-hidden="true"><Icon /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
