import { useState } from 'react';
import {
  FaSearch,
  FaBoxOpen,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaTruck,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSpinner,
} from 'react-icons/fa';
import { fetchShipment } from '../../data/trackingData.js';
import Button from '../Button/Button.jsx';
import styles from './TrackingForm.module.css';

export default function TrackingForm() {
  const [trackingId, setTrackingId] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!trackingId.trim()) return;

    setStatus('loading');
    setError('');
    setResult(null);

    try {
      const shipment = await fetchShipment(trackingId);
      setResult(shipment);
      setStatus('success');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <div className={styles.wrapper}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.inputWrap}>
          <FaBoxOpen className={styles.inputIcon} aria-hidden="true" />
          <label htmlFor="trackingId" className="sr-only">
            Tracking ID
          </label>
          <input
            id="trackingId"
            type="text"
            placeholder="Enter tracking ID e.g. SL123456789"
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            autoComplete="off"
          />
        </div>
        <Button
          type="submit"
          icon={status === 'loading' ? FaSpinner : FaSearch}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Tracking…' : 'Track Now'}
        </Button>
      </form>

      <p className={styles.hint}>
        Try a sample ID: <button type="button" onClick={() => setTrackingId('SL123456789')}>SL123456789</button>,{' '}
        <button type="button" onClick={() => setTrackingId('SL987654321')}>SL987654321</button>,{' '}
        <button type="button" onClick={() => setTrackingId('SL555000111')}>SL555000111</button>
      </p>

      {/* Error */}
      {status === 'error' && (
        <div className={`${styles.alert} ${styles.alertError}`} role="alert">
          <FaExclamationTriangle aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Result */}
      {status === 'success' && result && (
        <div className={styles.result}>
          <div className={styles.resultHead}>
            <div>
              <span className={styles.resultLabel}>Tracking ID</span>
              <h3 className={styles.resultId}>{result.trackingId}</h3>
            </div>
            <span className={`${styles.statusPill} ${styles[statusClass(result.status)]}`}>
              {result.status}
            </span>
          </div>

          <div className={styles.summary}>
            <div className={styles.summaryItem}>
              <FaTruck aria-hidden="true" />
              <div>
                <span>Service</span>
                <strong>{result.service}</strong>
              </div>
            </div>
            <div className={styles.summaryItem}>
              <FaMapMarkerAlt aria-hidden="true" />
              <div>
                <span>Current Location</span>
                <strong>{result.currentLocation}</strong>
              </div>
            </div>
            <div className={styles.summaryItem}>
              <FaCalendarAlt aria-hidden="true" />
              <div>
                <span>Estimated Delivery</span>
                <strong>{result.estimatedDelivery}</strong>
              </div>
            </div>
            <div className={styles.summaryItem}>
              <FaBoxOpen aria-hidden="true" />
              <div>
                <span>Route</span>
                <strong>
                  {result.origin} → {result.destination}
                </strong>
              </div>
            </div>
          </div>

          {/* Progress timeline */}
          <h4 className={styles.timelineTitle}>Shipment Progress</h4>
          <ol className={styles.timeline}>
            {result.timeline.map((step, i) => (
              <li
                key={i}
                className={[
                  styles.step,
                  step.done ? styles.stepDone : '',
                  step.current ? styles.stepCurrent : '',
                ].join(' ')}
              >
                <span className={styles.stepDot} aria-hidden="true">
                  {step.done ? <FaCheckCircle /> : <span className={styles.emptyDot} />}
                </span>
                <div className={styles.stepBody}>
                  <strong>{step.label}</strong>
                  <span>{step.location}</span>
                  <span className={styles.stepDate}>{step.date}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function statusClass(status) {
  const map = {
    Delivered: 'pillGreen',
    'In Transit': 'pillBlue',
    'Customs Clearance': 'pillOrange',
  };
  return map[status] || 'pillBlue';
}
