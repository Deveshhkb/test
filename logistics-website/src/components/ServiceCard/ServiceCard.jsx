import { FaArrowRight, FaCheck } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import useScrollReveal from '../../hooks/useScrollReveal.js';
import styles from './ServiceCard.module.css';

export default function ServiceCard({ service, index = 0 }) {
  const { Icon, title, description, features = [] } = service;
  const [ref, visible] = useScrollReveal();

  return (
    <article
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${styles.card}`}
      style={{ transitionDelay: `${(index % 3) * 90}ms` }}
    >
      <div className={styles.iconWrap} aria-hidden="true">
        <Icon />
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.desc}>{description}</p>

      {features.length > 0 && (
        <ul className={styles.features}>
          {features.map((f) => (
            <li key={f}>
              <FaCheck aria-hidden="true" /> {f}
            </li>
          ))}
        </ul>
      )}

      <Link to="/services" className={styles.more}>
        Learn More <FaArrowRight aria-hidden="true" />
      </Link>
    </article>
  );
}
