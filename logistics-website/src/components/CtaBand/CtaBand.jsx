import { FaPhoneAlt, FaPaperPlane } from 'react-icons/fa';
import Button from '../Button/Button.jsx';
import { company } from '../../data/siteConfig.js';
import styles from './CtaBand.module.css';

/** Full-width call-to-action band reused near the bottom of pages. */
export default function CtaBand({
  title = 'Ready to ship smarter?',
  text = 'Get a tailored freight quote in under two hours. Our logistics experts are standing by 24/7.',
}) {
  return (
    <section className={styles.band}>
      <div className={styles.overlay} aria-hidden="true" />
      <div className={`container ${styles.inner}`}>
        <div>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.text}>{text}</p>
        </div>
        <div className={styles.actions}>
          <Button to="/contact" size="lg" icon={FaPaperPlane}>
            Get a Quote
          </Button>
          <Button href={`tel:${company.phone.replace(/[^+\d]/g, '')}`} size="lg" variant="ghost" icon={FaPhoneAlt}>
            {company.phone}
          </Button>
        </div>
      </div>
    </section>
  );
}
