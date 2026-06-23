import { useState } from 'react';
import {
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope,
  FaClock,
  FaPaperPlane,
  FaCheckCircle,
} from 'react-icons/fa';
import PageHeader from '../../components/PageHeader/PageHeader.jsx';
import SectionHeading from '../../components/SectionHeading/SectionHeading.jsx';
import Button from '../../components/Button/Button.jsx';
import { company, socialLinks } from '../../data/siteConfig.js';
import styles from './Contact.module.css';

const initialForm = { name: '', email: '', phone: '', message: '' };

export default function Contact() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Please enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address.';
    if (!form.phone.trim()) next.phone = 'Please enter your phone number.';
    if (form.message.trim().length < 10) next.message = 'Message must be at least 10 characters.';
    return next;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const next = validate();
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    // In a real app this would POST to an API endpoint.
    setSent(true);
    setForm(initialForm);
  };

  return (
    <>
      <PageHeader
        title="Contact Us"
        subtitle="Have a shipment to move or a question to ask? Our team is ready to help, 24/7."
        breadcrumb={['Contact']}
      />

      <section className="section">
        <div className="container">
          <div className={styles.layout}>
            {/* Info column */}
            <aside className={styles.info}>
              <SectionHeading align="left" eyebrow="Get in Touch" title="Let's Talk Logistics" />
              <p className={styles.lead}>
                Reach out for quotes, support or partnership enquiries. We typically respond within
                two business hours.
              </p>

              <ul className={styles.infoList}>
                <li>
                  <span className={styles.infoIcon} aria-hidden="true"><FaMapMarkerAlt /></span>
                  <div>
                    <strong>Head Office</strong>
                    <span>{company.address}</span>
                  </div>
                </li>
                <li>
                  <span className={styles.infoIcon} aria-hidden="true"><FaPhoneAlt /></span>
                  <div>
                    <strong>Phone</strong>
                    <a href={`tel:${company.phone.replace(/[^+\d]/g, '')}`}>{company.phone}</a>
                  </div>
                </li>
                <li>
                  <span className={styles.infoIcon} aria-hidden="true"><FaEnvelope /></span>
                  <div>
                    <strong>Email</strong>
                    <a href={`mailto:${company.email}`}>{company.email}</a>
                  </div>
                </li>
                <li>
                  <span className={styles.infoIcon} aria-hidden="true"><FaClock /></span>
                  <div>
                    <strong>Working Hours</strong>
                    {company.workingHours.map((w) => (
                      <span key={w.day}>
                        {w.day}: {w.hours}
                      </span>
                    ))}
                  </div>
                </li>
              </ul>

              <div className={styles.socials}>
                {socialLinks.map(({ label, href, Icon }) => (
                  <a key={label} href={href} aria-label={label} target="_blank" rel="noopener noreferrer">
                    <Icon />
                  </a>
                ))}
              </div>
            </aside>

            {/* Form column */}
            <div className={styles.formCard}>
              {sent ? (
                <div className={styles.success} role="status">
                  <FaCheckCircle aria-hidden="true" />
                  <h3>Thank you — message sent!</h3>
                  <p>Our logistics team will get back to you within two business hours.</p>
                  <Button onClick={() => setSent(false)} variant="outline">
                    Send another message
                  </Button>
                </div>
              ) : (
                <form className={styles.form} onSubmit={handleSubmit} noValidate>
                  <div className={styles.field}>
                    <label htmlFor="name">Full Name</label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="John Carter"
                      aria-invalid={!!errors.name}
                    />
                    {errors.name && <span className={styles.error}>{errors.name}</span>}
                  </div>

                  <div className={styles.row}>
                    <div className={styles.field}>
                      <label htmlFor="email">Email</label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="john@company.com"
                        aria-invalid={!!errors.email}
                      />
                      {errors.email && <span className={styles.error}>{errors.email}</span>}
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="phone">Phone</label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="+1 (555) 000-0000"
                        aria-invalid={!!errors.phone}
                      />
                      {errors.phone && <span className={styles.error}>{errors.phone}</span>}
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="message">Message</label>
                    <textarea
                      id="message"
                      name="message"
                      rows="5"
                      value={form.message}
                      onChange={handleChange}
                      placeholder="Tell us about your shipment or enquiry…"
                      aria-invalid={!!errors.message}
                    />
                    {errors.message && <span className={styles.error}>{errors.message}</span>}
                  </div>

                  <Button type="submit" size="lg" icon={FaPaperPlane} fullWidth>
                    Send Message
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Map placeholder */}
      <section className={styles.mapSection} aria-label="Office location map">
        <iframe
          title="SwiftLane Logistics head office location"
          className={styles.map}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src="https://www.google.com/maps?q=Long+Beach,+CA&output=embed"
        />
      </section>
    </>
  );
}
