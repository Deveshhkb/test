import { FaWeightHanging, FaCogs } from 'react-icons/fa';
import useScrollReveal from '../../hooks/useScrollReveal.js';
import styles from './FleetCard.module.css';

export default function FleetCard({ vehicle, index = 0 }) {
  const { name, type, capacity, axles, description, image } = vehicle;
  const [ref, visible] = useScrollReveal();

  return (
    <article
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${styles.card}`}
      style={{ transitionDelay: `${(index % 3) * 90}ms` }}
    >
      <div className={styles.media}>
        <img src={image} alt={name} loading="lazy" width="900" height="600" />
        <span className={styles.badge}>{type}</span>
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>{name}</h3>
        <p className={styles.desc}>{description}</p>

        <ul className={styles.specs}>
          <li>
            <FaWeightHanging aria-hidden="true" />
            <span>{capacity}</span>
          </li>
          <li>
            <FaCogs aria-hidden="true" />
            <span>{axles}</span>
          </li>
        </ul>
      </div>
    </article>
  );
}
