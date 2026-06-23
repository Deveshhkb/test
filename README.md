# Ayodhya Tirtham — Premium Spiritual Pilgrimage Platform

A production-ready, SEO-optimised pilgrimage tourism website inspired by modern
portals such as Ayodhya Tirtham. Built with **Next.js 15 (App Router)**,
**React 19**, **TypeScript**, **Tailwind CSS**, **GSAP**, **Framer Motion** and
**Swiper.js**.

## ✨ Features

- **Premium spiritual design** — golden, saffron, white & deep-blue palette,
  glassmorphism cards, particle backgrounds, luxury typography.
- **GSAP + Framer Motion** — hero text reveal, scroll-triggered parallax,
  count-up statistics, hover effects, page transitions.
- **Fully responsive & mobile-first**, accessible (skip links, reduced-motion
  support, semantic markup).
- **SEO ready** — dynamic metadata, Open Graph, JSON-LD schema, `sitemap.xml`,
  `robots.txt`, canonical URLs.
- **Performance** — Server Components for data fetching, `next/image`
  optimisation, lazy loading, code-splitting, package-import optimisation.

## 📄 Pages

| Route | Description |
| ----- | ----------- |
| `/` | Home — hero slider, quick search, featured temples, about, destinations, events, packages, stats, videos, gallery, testimonials, news, FAQ, contact CTA |
| `/temples` | Temple directory — search, filters, grid/list, infinite scroll |
| `/temples/[slug]` | Temple details — gallery, history, timings, map, attractions, festivals, FAQ, reviews, sticky booking sidebar |
| `/events` | Events & festivals — featured countdown, filters, registration form |
| `/gallery` | Masonry photo gallery with lightbox, filters & lazy loading |
| `/videos` | Video gallery with category filters & popup YouTube player |
| `/blog` & `/blog/[slug]` | News & blog with search, categories, related posts |
| `/packages` | Pilgrimage packages with itineraries & booking form |
| `/about` | Mission, vision, history timeline, team, gallery |
| `/contact` | Contact form, Google Map, office details, social links |

## 🏗️ Architecture

```
app/            # Next.js App Router pages, layouts, sitemap & robots
components/     # Reusable UI, layout, home sections, cards, media, page modules
hooks/          # useScrollReveal, useCountUp, useCountdown
lib/            # config, animation variants, GSAP setup, seed data
services/       # API-shaped data access layer (swap seed data for a real API)
store/          # Zustand global UI store (drawer, search overlay)
types/          # Shared TypeScript domain types
utils/          # Formatting & helper utilities
```

The **services layer** returns API-shaped, async responses backed by seed data
in `lib/data`. To connect a real backend, replace the bodies of
`services/*.service.ts` with `fetch` calls — no UI changes required.

## 🚀 Getting Started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve production build
npm run lint     # eslint
npm run type-check
```

## 🖼️ Images

Placeholder imagery is served from Unsplash and avatars from pravatar.cc
(configured in `next.config.mjs`). Replace with your own optimised assets for
production.
