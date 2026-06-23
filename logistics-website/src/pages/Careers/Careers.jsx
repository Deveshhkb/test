import { useState } from 'react';
import { FaMapMarkerAlt, FaBriefcase, FaBuilding, FaTimes, FaCheckCircle } from 'react-icons/fa';
import PageHeader from '../../components/PageHeader/PageHeader.jsx';
import SectionHeading from '../../components/SectionHeading/SectionHeading.jsx';
import Button from '../../components/Button/Button.jsx';
import { jobs, benefits } from '../../data/jobs.js';
import styles from './Careers.module.css';

export default function Careers() {
  const [activeJob, setActiveJob] = useState(null);
  const [applied, setApplied] = useState(false);

  const openApply = (job) => {
    setActiveJob(job);
    setApplied(false);
  };
  const closeApply = () => setActiveJob(null);

  return (
    <>
      <PageHeader
        title="Careers at SwiftLane"
        subtitle="Join a team that keeps the world moving. Build your career with purpose, growth and great people."
        breadcrumb={['Careers']}
      />

      {/* Benefits */}
      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Why Work With Us"
            title="Benefits & Perks"
            subtitle="We invest in our people with competitive rewards and a culture built on respect."
          />
          <div className={styles.benefitGrid}>
            {benefits.map(({ id, Icon, title, text }) => (
              <div key={id} className={styles.benefit}>
                <span className={styles.benefitIcon} aria-hidden="true"><Icon /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Job listings */}
      <section className="section section--alt">
        <div className="container">
          <SectionHeading
            eyebrow="Open Positions"
            title="Find Your Next Role"
            subtitle="Explore current openings across our operations, fleet and corporate teams."
          />
          <div className={styles.jobs}>
            {jobs.map((job) => (
              <article key={job.id} className={styles.job}>
                <div className={styles.jobMain}>
                  <h3 className={styles.jobTitle}>{job.title}</h3>
                  <p className={styles.jobDesc}>{job.description}</p>
                  <ul className={styles.jobMeta}>
                    <li><FaBuilding aria-hidden="true" /> {job.department}</li>
                    <li><FaMapMarkerAlt aria-hidden="true" /> {job.location}</li>
                    <li><FaBriefcase aria-hidden="true" /> {job.type}</li>
                  </ul>
                </div>
                <Button onClick={() => openApply(job)} className={styles.applyBtn}>
                  Apply Now
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Apply modal */}
      {activeJob && (
        <div className={styles.modalOverlay} onClick={closeApply} role="presentation">
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="apply-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button className={styles.modalClose} onClick={closeApply} aria-label="Close">
              <FaTimes />
            </button>

            {applied ? (
              <div className={styles.applied}>
                <FaCheckCircle aria-hidden="true" />
                <h3>Application received!</h3>
                <p>Thanks for applying to <strong>{activeJob.title}</strong>. Our talent team will be in touch soon.</p>
                <Button onClick={closeApply}>Done</Button>
              </div>
            ) : (
              <>
                <h3 id="apply-title" className={styles.modalTitle}>Apply: {activeJob.title}</h3>
                <p className={styles.modalSub}>{activeJob.department} · {activeJob.location}</p>
                <form
                  className={styles.modalForm}
                  onSubmit={(e) => {
                    e.preventDefault();
                    setApplied(true);
                  }}
                >
                  <label>
                    Full Name
                    <input type="text" required placeholder="Jane Doe" />
                  </label>
                  <label>
                    Email
                    <input type="email" required placeholder="jane@email.com" />
                  </label>
                  <label>
                    Resume / CV link
                    <input type="url" placeholder="https://…" />
                  </label>
                  <label>
                    Why are you a great fit?
                    <textarea rows="3" placeholder="Tell us about yourself…" />
                  </label>
                  <Button type="submit" fullWidth>Submit Application</Button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
