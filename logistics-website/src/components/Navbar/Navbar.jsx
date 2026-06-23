import { useState, useEffect, useCallback } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { FaBars, FaTimes, FaTruckMoving, FaPhoneAlt } from 'react-icons/fa';
import { navLinks, company } from '../../data/siteConfig.js';
import Button from '../Button/Button.jsx';
import styles from './Navbar.module.css';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const closeMenu = useCallback(() => setOpen(false), []);

  // Add a shadow / solid background once the user scrolls.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll + allow Escape to close while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e) => e.key === 'Escape' && closeMenu();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, closeMenu]);

  return (
    <header className={[styles.header, scrolled ? styles.scrolled : ''].join(' ')}>
      <nav className={`container ${styles.nav}`} aria-label="Primary">
        <Link to="/" className={styles.logo} onClick={closeMenu} aria-label={`${company.name} home`}>
          <span className={styles.logoMark} aria-hidden="true">
            <FaTruckMoving />
          </span>
          <span className={styles.logoText}>
            Swift<span className={styles.logoAccent}>Lane</span>
          </span>
        </Link>

        {/* Desktop links */}
        <ul className={styles.desktopLinks}>
          {navLinks.map((link) => (
            <li key={link.path}>
              <NavLink
                to={link.path}
                className={({ isActive }) =>
                  isActive ? `${styles.link} ${styles.active}` : styles.link
                }
                end={link.path === '/'}
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          <a href={`tel:${company.phone.replace(/[^+\d]/g, '')}`} className={styles.phone}>
            <FaPhoneAlt aria-hidden="true" />
            <span>{company.phone}</span>
          </a>
          <Button to="/tracking" size="sm" className={styles.cta}>
            Track Shipment
          </Button>

          <button
            className={styles.burger}
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-drawer"
          >
            {open ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div
        id="mobile-drawer"
        className={[styles.drawer, open ? styles.drawerOpen : ''].join(' ')}
        aria-hidden={!open}
      >
        <ul className={styles.drawerLinks}>
          {navLinks.map((link) => (
            <li key={link.path}>
              <NavLink
                to={link.path}
                onClick={closeMenu}
                className={({ isActive }) =>
                  isActive ? `${styles.drawerLink} ${styles.active}` : styles.drawerLink
                }
                end={link.path === '/'}
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <Button to="/tracking" fullWidth onClick={closeMenu}>
          Track Shipment
        </Button>
        <a href={`tel:${company.phone.replace(/[^+\d]/g, '')}`} className={styles.drawerPhone}>
          <FaPhoneAlt aria-hidden="true" /> {company.phone}
        </a>
      </div>

      {/* Backdrop */}
      {open && <div className={styles.backdrop} onClick={closeMenu} aria-hidden="true" />}
    </header>
  );
}
