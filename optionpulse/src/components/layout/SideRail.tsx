import { NavLink } from "react-router-dom";
import { classNames } from "../../utils/format";
import { NAV_ITEMS } from "./navItems";

export function SideRail() {
  return (
    <nav className="app-rail" aria-label="Primary">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) => classNames("rail-link", isActive && "rail-link--active")}
        >
          <span className="rail-link__icon">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
      <div className="rail-section">Reference</div>
      <NavLink
        to="/settings"
        className={({ isActive }) => classNames("rail-link", isActive && "rail-link--active")}
      >
        <span className="rail-link__icon" aria-hidden />
        Settings &amp; data
      </NavLink>
    </nav>
  );
}

export function MobileNav() {
  const items = NAV_ITEMS.filter((item) => item.primary);
  return (
    <nav className="mobile-nav" aria-label="Primary mobile">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            classNames("mobile-nav__link", isActive && "mobile-nav__link--active")
          }
        >
          <span aria-hidden>{item.icon}</span>
          <span>{item.shortLabel}</span>
        </NavLink>
      ))}
    </nav>
  );
}
