# 🕉 Ayodhya Tirtham — Pilgrimage & Tourism Platform

A modern, production-ready spiritual tourism platform for booking pilgrimage tours
to **Ayodhya, Varanasi, Prayagraj, Naimisharanya, Chitrakoot, Mathura & Vrindavan**.
Browse temples, tour packages, hotels and cabs; read blogs; switch between 8 Indian
languages; and manage bookings — with premium GSAP / Framer Motion animations.

> Inspired by Ayodhya Tirtham. Built as a full-stack monorepo.

---

## 🧱 Tech Stack

| Layer | Technologies |
|------|--------------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, GSAP, Framer Motion, Swiper.js, react-i18next |
| **Backend** | Node.js, Express.js, MongoDB (Mongoose), JWT auth |
| **SEO** | Dynamic meta tags, Open Graph, JSON-LD structured data, canonical URLs, `next-sitemap`, robots.txt |
| **Deployment** | Vercel (frontend) · VPS / AWS (backend) |

---

## 📂 Project Structure

```
.
├── frontend/                 # Next.js app (App Router)
│   ├── src/
│   │   ├── app/              # Routes (home, destinations, temples, packages, hotels,
│   │   │                     #         cabs, gallery, blog, about, contact, login,
│   │   │                     #         register, dashboard, admin)
│   │   ├── components/
│   │   │   ├── layout/       # Header, Footer, LanguageSelector, FloatingContact
│   │   │   ├── home/         # Hero, sections (destinations, packages, stats, ...)
│   │   │   ├── shared/       # Reusable cards, forms, animation wrappers
│   │   │   └── views/        # Client page bodies (interactive filters/sorts)
│   │   ├── data/            # Static SSR content (also seeded into the DB)
│   │   ├── i18n/            # i18next config + JSON locales for 8 languages
│   │   └── lib/             # api client, auth context, localize + SEO helpers
│   ├── tailwind.config.ts
│   ├── next.config.js
│   └── next-sitemap.config.js
│
└── backend/                  # Express + MongoDB API
    └── src/
        ├── config/          # DB connection
        ├── models/          # User, Destination, Temple, Package, Hotel, Cab,
        │                    # Blog, Gallery, Enquiry, Booking, Testimonial
        ├── controllers/     # Auth, bookings, enquiries, admin + CRUD factory
        ├── routes/          # REST routes (public read, admin write)
        ├── middleware/      # JWT auth, role guard, error handling
        └── seed/            # Database seeder with realistic data
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB running locally or a MongoDB Atlas URI

### 1. Backend

```bash
cd backend
cp .env.example .env          # then edit values (MONGO_URI, JWT_SECRET, admin creds)
npm install
npm run seed                  # populate the database with sample data + admin user
npm run dev                   # http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local     # set NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm install
npm run dev                    # http://localhost:3000
```

> The frontend renders all catalog content from `src/data/content.ts` for fast SSR,
> so the marketing site works even **without** the backend running. Auth, bookings,
> enquiries and the admin panel use the live API.

---

## 🔐 Default Admin

After running the seeder, log in with the credentials from your `.env`:

```
Email:    admin@ayodhyatirtham.com
Password: Admin@12345
```

Then open `/admin` for the dashboard.

---

## 🌐 Multilingual Support

Eight languages with `react-i18next` + JSON translation files:

`English · हिन्दी · ગુજરાતી · मराठी · বাংলা · தமிழ் · తెలుగు · ಕನ್ನಡ`

- Header dropdown selector with flags & native names
- Auto-detects the browser language, persists choice in `localStorage`
- English & Hindi are fully translated; other languages cover navigation, hero and
  key CTAs and **fall back to English** for any missing key
- Dynamic content (packages, temples, blogs) stores translations per-language

Add a language by dropping a `src/i18n/locales/<code>/common.json` file and
registering it in `src/i18n/config.ts` and `src/i18n/languages.ts`.

---

## 🔌 API Overview

Base URL: `/api`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/auth/register` `/auth/login` | Public | Register / login (JWT) |
| POST | `/auth/otp/request` `/auth/otp/verify` | Public | OTP login |
| GET/PUT | `/auth/me` | User | Profile |
| GET | `/destinations` `/temples` `/packages` `/hotels` `/cabs` `/blogs` `/gallery` `/testimonials` | Public | List / get by id or slug |
| POST/PUT/DELETE | *(same resources)* | Admin | Manage catalog |
| POST | `/enquiries` | Public | Submit enquiry form |
| POST | `/bookings` · GET `/bookings/mine` | User | Create / view bookings |
| GET | `/admin/stats` `/admin/users` | Admin | Dashboard + user management |

Read endpoints support `?search=`, `?sort=`, `?featured=true`, `?category=`,
`?page=` & `?limit=`.

---

## 🎨 Design System

| Token | Value |
|-------|-------|
| Primary | `#FF7A00` |
| Secondary | `#D4AF37` |
| Background | `#FFFFFF` |
| Text | `#222222` |
| Fonts | Poppins (headings), Inter (body) |

Mobile-first, responsive, GPU-friendly animations (transform/opacity only) that stay
smooth on low-end devices and respect `prefers-reduced-motion`.

---

## ⚡ Performance & SEO

- Server-Side Rendering + static generation for detail pages (`generateStaticParams`)
- `next/image` with AVIF/WebP, lazy loading & responsive `sizes`
- Automatic code-splitting per route
- Per-page metadata, Open Graph, Twitter cards, canonical URLs, JSON-LD
- `next-sitemap` generates `sitemap.xml` + `robots.txt` on build (`postbuild`)

---

## 📦 Deployment

### Frontend → Vercel
1. Import the `frontend/` directory as a Vercel project.
2. Set env vars: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_WHATSAPP_NUMBER`.
3. Deploy — `next build` runs `next-sitemap` automatically.

### Backend → VPS / AWS
1. Provision a Node 18+ server with MongoDB (or use MongoDB Atlas).
2. `cd backend && npm ci && npm run seed`.
3. Run with a process manager: `pm2 start src/server.js --name ayodhya-api`.
4. Put it behind Nginx with HTTPS and set `CLIENT_URL` to your frontend origin.

### Environment Variables
See [`backend/.env.example`](backend/.env.example) and
[`frontend/.env.example`](frontend/.env.example).

---

## 📝 Notes

- The repository also contains a leftover `pixi-project/` demo and a root
  `package.json` from the original template — they are unrelated to this app and can
  be safely removed.

## License

MIT
