import { FaLinkedinIn, FaTwitter } from 'react-icons/fa';
import useScrollReveal from '../../hooks/useScrollReveal.js';
import styles from './TeamCard.module.css';

export default function TeamCard({ member, index = 0 }) {
  const { name, role, image, socials = {} } = member;
  const [ref, visible] = useScrollReveal();

  return (
    <article
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${styles.card}`}
      style={{ transitionDelay: `${(index % 4) * 80}ms` }}
    >
      <div className={styles.media}>
        <img src={image} alt={name} loading="lazy" width="500" height="500" />
        <div className={styles.socials}>
          {socials.linkedin && (
            <a href={socials.linkedin} aria-label={`${name} on LinkedIn`}>
              <FaLinkedinIn />
            </a>
          )}
          {socials.twitter && (
            <a href={socials.twitter} aria-label={`${name} on Twitter`}>
              <FaTwitter />
            </a>
          )}
        </div>
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{name}</h3>
        <p className={styles.role}>{role}</p>
      </div>
    </article>
  );
}
