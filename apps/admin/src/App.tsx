import { useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { getAdminToken, setAdminToken } from './api';
import { Dashboard } from './pages/Dashboard';
import { Orders } from './pages/Orders';
import { Restaurants } from './pages/Restaurants';
import { Drivers } from './pages/Drivers';
import { Coupons } from './pages/Coupons';

const NAV = [
  { to: '/', label: '📊 Dashboard' },
  { to: '/orders', label: '🧾 Orders' },
  { to: '/restaurants', label: '🍳 Restaurants' },
  { to: '/drivers', label: '🛵 Drivers' },
  { to: '/coupons', label: '🎟️ Coupons' },
];

export const App = () => {
  const [token, setToken] = useState(getAdminToken());
  const [input, setInput] = useState('');

  if (!token) {
    return (
      <div className="layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="panel" style={{ width: 420 }}>
          <h2>Savora Admin — sign in</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 14 }}>
            Paste the admin JWT for an admin-role account (see docs/API.md → auth).
          </p>
          <div className="form-grid">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="eyJhbGciOi…"
            />
          </div>
          <button
            onClick={() => {
              setAdminToken(input.trim());
              setToken(input.trim());
            }}
            disabled={!input.trim()}
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">🍽️ Savora</div>
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}>
            {item.label}
          </NavLink>
        ))}
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/restaurants" element={<Restaurants />} />
          <Route path="/drivers" element={<Drivers />} />
          <Route path="/coupons" element={<Coupons />} />
        </Routes>
      </main>
    </div>
  );
};
