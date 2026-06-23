import { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import styles from './FaqAccordion.module.css';

export default function FaqAccordion({ items = [] }) {
  const [openId, setOpenId] = useState(items[0]?.id ?? null);

  const toggle = (id) => setOpenId((current) => (current === id ? null : id));

  return (
    <div className={styles.accordion}>
      {items.map((item) => {
        const isOpen = openId === item.id;
        const panelId = `faq-panel-${item.id}`;
        const btnId = `faq-btn-${item.id}`;
        return (
          <div key={item.id} className={[styles.item, isOpen ? styles.open : ''].join(' ')}>
            <h3 className={styles.headingRow}>
              <button
                id={btnId}
                className={styles.trigger}
                onClick={() => toggle(item.id)}
                aria-expanded={isOpen}
                aria-controls={panelId}
              >
                <span>{item.question}</span>
                <FaChevronDown className={styles.chevron} aria-hidden="true" />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={btnId}
              className={styles.panel}
              hidden={!isOpen}
            >
              <p>{item.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
