import { FaHome, FaTruckMoving } from 'react-icons/fa';
import Button from '../../components/Button/Button.jsx';
import styles from './NotFound.module.css';

export default function NotFound() {
  return (
    <section className={styles.wrap}>
      <div className="container">
        <span className={styles.icon} aria-hidden="true"><FaTruckMoving /></span>
        <h1 className={styles.code}>404</h1>
        <h2 className={styles.title}>This route went off the map</h2>
        <p className={styles.text}>
          The page you're looking for has been moved, delivered elsewhere, or never existed. Let's get
          you back on track.
        </p>
        <Button to="/" size="lg" icon={FaHome}>
          Back to Home
        </Button>
      </div>
    </section>
  );
}
