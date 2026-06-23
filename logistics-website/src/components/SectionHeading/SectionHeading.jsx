import styles from './SectionHeading.module.css';

/** Reusable eyebrow + title + subtitle block used across sections. */
export default function SectionHeading({ eyebrow, title, subtitle, align = 'center', light = false }) {
  return (
    <div
      className={[styles.heading, styles[align], light ? styles.light : ''].filter(Boolean).join(' ')}
    >
      {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
      <h2 className={styles.title}>{title}</h2>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  );
}
