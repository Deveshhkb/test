import { FaQuoteRight, FaStar } from 'react-icons/fa';
import styles from './TestimonialCard.module.css';

export default function TestimonialCard({ testimonial }) {
  const { name, role, rating, avatar, quote } = testimonial;

  return (
    <figure className={styles.card}>
      <FaQuoteRight className={styles.quoteIcon} aria-hidden="true" />

      <div className={styles.stars} aria-label={`${rating} out of 5 stars`}>
        {Array.from({ length: rating }).map((_, i) => (
          <FaStar key={i} aria-hidden="true" />
        ))}
      </div>

      <blockquote className={styles.quote}>“{quote}”</blockquote>

      <figcaption className={styles.author}>
        <img src={avatar} alt={name} loading="lazy" width="56" height="56" />
        <div>
          <span className={styles.name}>{name}</span>
          <span className={styles.role}>{role}</span>
        </div>
      </figcaption>
    </figure>
  );
}
