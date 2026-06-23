import { Link } from 'react-router-dom';
import { FaTruckMoving, FaMapMarkerAlt, FaPhoneAlt, FaEnvelope, FaPaperPlane } from 'react-icons/fa';
import { company, navLinks, socialLinks } from '../../data/siteConfig.js';
import { services } from '../../data/services.js';
import styles from './Footer.module.css';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.grid}`}>
        {/* Brand + newsletter */}
        <div className={styles.col}>
          <Link to="/" className={styles.logo} aria-label={`${company.name} home`}>
            <span className={styles.logoMark} aria-hidden="true">
              <FaTruckMoving />
            </span>
            <span>
              Swift<span className={styles.accent}>Lane</span>
            </span>
          </Link>
          <p className={styles.about}>
            Global transport &amp; logistics solutions — road, air and sea freight, warehousing and
            real-time tracking, delivered with precision since 2004.
          </p>

          <form className={styles.newsletter} onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="newsletter" className="sr-only">
              Email address for newsletter
            </label>
            <input
              id="newsletter"
              type="email"
              placeholder="Your email address"
              required
              className={styles.newsletterInput}
            />
            <button type="submit" className={styles.newsletterBtn} aria-label="Subscribe">
              <FaPaperPlane />
            </button>
          </form>
        </div>

        {/* Quick links */}
        <div className={styles.col}>
          <h3 className={styles.heading}>Quick Links</h3>
          <ul className={styles.links}>
            {navLinks.map((link) => (
              <li key={link.path}>
                <Link to={link.path}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Services */}
        <div className={styles.col}>
          <h3 className={styles.heading}>Our Services</h3>
          <ul className={styles.links}>
            {services.map((service) => (
              <li key={service.id}>
                <Link to="/services">{service.title}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div className={styles.col}>
          <h3 className={styles.heading}>Get in Touch</h3>
          <ul className={styles.contact}>
            <li>
              <FaMapMarkerAlt aria-hidden="true" />
              <span>{company.address}</span>
            </li>
            <li>
              <FaPhoneAlt aria-hidden="true" />
              <a href={`tel:${company.phone.replace(/[^+\d]/g, '')}`}>{company.phone}</a>
            </li>
            <li>
              <FaEnvelope aria-hidden="true" />
              <a href={`mailto:${company.email}`}>{company.email}</a>
            </li>
          </ul>

          <div className={styles.socials}>
            {socialLinks.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className={styles.social}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.bar}>
        <div className={`container ${styles.barInner}`}>
          <p>
            © {year} {company.name}. All rights reserved.
          </p>
          <p className={styles.barLinks}>
            <a href="#privacy">Privacy Policy</a>
            <span aria-hidden="true">·</span>
            <a href="#terms">Terms of Service</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
