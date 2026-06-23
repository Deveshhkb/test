import { Link } from 'react-router-dom';
import { FaChevronRight } from 'react-icons/fa';
import styles from './PageHeader.module.css';

/** Banner used at the top of inner pages, with a breadcrumb. */
export default function PageHeader({ title, subtitle, breadcrumb = [] }) {
  return (
    <section className={styles.header}>
      <div className={styles.overlay} aria-hidden="true" />
      <div className={`container ${styles.inner}`}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}

        <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
          <Link to="/">Home</Link>
          {breadcrumb.map((crumb) => (
            <span key={crumb} className={styles.crumb}>
              <FaChevronRight aria-hidden="true" />
              <span aria-current="page">{crumb}</span>
            </span>
          ))}
        </nav>
      </div>
    </section>
  );
}
