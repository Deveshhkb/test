# SwiftLane Logistics — React Website

A modern, fully responsive **Transport & Logistics company website** built with React.js,
React Router and CSS Modules. It features a professional blue / white / orange theme, smooth
scroll animations, lazy-loaded routes, an animated statistics counter, a working shipment
tracking demo (with mock API data), an accessible FAQ accordion, a careers board with an
apply modal, and a validated contact form.

## ✨ Features

- **7 pages** — Home, About, Services, Fleet, Tracking, Careers, Contact (+ a 404 page)
- **Sticky navbar** with desktop nav and an animated mobile hamburger drawer
- **Hero section** with a logistics truck background, headline, CTA + contact buttons
- **Reusable components** — Button, ServiceCard, FleetCard, TeamCard, TestimonialCard,
  FaqAccordion, StatsCounter, TrackingForm, PageHeader, CtaBand
- **Shipment tracking** with a dummy API, status, current location, ETA and a progress timeline
- **Animations** — fade/slide-up scroll reveals (IntersectionObserver), hover effects, count-up stats
- **Performance** — route-level code splitting (`React.lazy` + `Suspense`), lazy-loaded images,
  manual vendor chunking in Vite
- **Accessibility** — semantic HTML, ARIA labels, keyboard-friendly menu/accordion/modal,
  skip-link, `prefers-reduced-motion` support
- **Responsive** — mobile-first layout that scales cleanly to tablet, laptop and desktop
- **SEO** — descriptive `<title>`, meta description/keywords and Open Graph tags

## 🛠 Tech Stack

| Tool | Purpose |
|------|---------|
| React 18 (functional components + hooks) | UI |
| React Router DOM 6 | Client-side routing |
| CSS Modules | Scoped, component-level styling |
| React Icons | High-quality SVG icons |
| Vite | Dev server & build tool |

## 📁 Folder Structure

```
logistics-website/
├── index.html                 # SEO meta tags, fonts, root mount
├── package.json
├── vite.config.js             # Vite + manual vendor chunks
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx               # App entry (BrowserRouter)
    ├── App.jsx                # Routes + lazy loading + layout
    ├── styles/
    │   └── global.css         # Design tokens, reset, utilities
    ├── hooks/
    │   └── useScrollReveal.js  # IntersectionObserver reveal hook
    ├── data/                   # All site content + mock tracking API
    │   ├── siteConfig.js
    │   ├── services.js
    │   ├── fleet.js
    │   ├── testimonials.js
    │   ├── faqs.js
    │   ├── team.js
    │   ├── jobs.js
    │   ├── stats.js
    │   └── trackingData.js
    ├── components/             # Reusable UI (each with its .module.css)
    │   ├── Navbar/
    │   ├── Footer/
    │   ├── Button/
    │   ├── SectionHeading/
    │   ├── ServiceCard/
    │   ├── FleetCard/
    │   ├── TeamCard/
    │   ├── TestimonialCard/
    │   ├── FaqAccordion/
    │   ├── StatsCounter/
    │   ├── TrackingForm/
    │   ├── PageHeader/
    │   ├── CtaBand/
    │   ├── Loader/
    │   └── ScrollToTop/
    └── pages/                  # One folder per route
        ├── Home/
        ├── About/
        ├── Services/
        ├── Fleet/
        ├── Tracking/
        ├── Careers/
        ├── Contact/
        └── NotFound/
```

## 🚀 Getting Started

> Requires **Node.js 18+** and npm.

```bash
# 1. Move into the project
cd logistics-website

# 2. Install dependencies
npm install

# 3. Start the dev server (http://localhost:5173)
npm run dev

# 4. Build for production
npm run build

# 5. Preview the production build
npm run preview
```

## 📦 Shipment Tracking Demo

The Tracking page calls a mock async API in `src/data/trackingData.js`.
Try any of these sample tracking IDs:

| Tracking ID | Status |
|-------------|--------|
| `SL123456789` | In Transit |
| `SL987654321` | Delivered |
| `SL555000111` | Customs Clearance |

## 🎨 Customisation

- **Colours / spacing / radii** — edit the CSS variables in `src/styles/global.css`.
- **Content** — all copy, services, fleet, team, jobs and FAQs live in `src/data/`.
- **Images** — sourced from Unsplash via URL; swap the URLs in the `data/` files.

## 📄 License

Provided as-is for demonstration and educational purposes.
