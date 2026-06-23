import { Link } from 'react-router-dom';
import styles from './Button.module.css';

/**
 * Polymorphic button:
 *  - `to`   -> renders a react-router <Link>
 *  - `href` -> renders an <a>
 *  - else   -> renders a <button>
 *
 * Props: variant ('primary' | 'secondary' | 'outline' | 'ghost'),
 *        size ('sm' | 'md' | 'lg'), icon, iconRight, fullWidth.
 */
export default function Button({
  children,
  to,
  href,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight = false,
  fullWidth = false,
  className = '',
  ...rest
}) {
  const classes = [
    styles.btn,
    styles[variant],
    styles[size],
    fullWidth ? styles.full : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {Icon && !iconRight && <Icon className={styles.icon} aria-hidden="true" />}
      <span>{children}</span>
      {Icon && iconRight && <Icon className={styles.icon} aria-hidden="true" />}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {content}
      </a>
    );
  }

  return (
    <button className={classes} {...rest}>
      {content}
    </button>
  );
}
