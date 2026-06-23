import styles from './Loader.module.css';

/** Lightweight fallback shown while lazy-loaded pages are fetched. */
export default function Loader() {
  return (
    <div className={styles.wrapper} role="status" aria-live="polite">
      <div className={styles.spinner} aria-hidden="true" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
