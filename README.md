# NovaStyle — Fashion E-Commerce Platform

A production-ready, full-stack fashion e-commerce platform — original branding, modern UI,
and a complete shopping experience inspired by leading apparel storefronts. Built as a
monorepo with a **storefront**, a **REST API**, and an **admin panel**.

> All branding ("NovaStyle"), copy, and UI are original. Product imagery uses royalty-free
> Unsplash photos via URL and contains no third-party logos or copyrighted assets.

---

## ✨ Features

### Storefront (`apps/frontend`)
- **Home**: hero slider, category grid, trending / new-arrivals / best-sellers rails, promo
  banners, testimonials, newsletter, feature marquee.
- **Header**: sticky nav, mega menu, instant search overlay (with history + suggestions),
  wishlist & cart badges, account dropdown, mobile drawer.
- **Catalog**: Men, Women, Footwear, Accessories, Collections, New Arrivals, Best Sellers.
- **Listing (PLP)**: filters (price, size, color, brand), sort, **infinite scroll** + load-more.
- **Product (PDP)**: zoom gallery, multiple images, variants (color/size), stock status,
  specifications, ratings & reviews, related products, **recently viewed**, add-to-cart, buy-now.
- **Cart**: slide-out drawer + full page, quantity updates, remove, **coupon system**,
  shipping estimate, order summary.
- **Checkout**: address management, shipping method, payment method, **Razorpay** + COD,
  order review, confirmation.
- **Auth**: register, login, forgot/reset password, OTP endpoints, JWT (httpOnly cookie).
- **Account**: profile, orders, wishlist, addresses, notifications.
- **SEO**: dynamic metadata, Open Graph, JSON-LD (Organization + Product), `sitemap.xml`,
  `robots.txt`, canonical URLs.
- **Animations**: Framer Motion (scroll reveals, hover, cart drawer), Swiper sliders, GSAP available.

### API (`apps/backend`)
- Express + MongoDB (Mongoose), **12 models**, **66 routes**.
- JWT auth + role-based authorization, bcrypt password hashing.
- Products w/ variants & SKUs, cart, wishlist, orders, reviews, coupons, banners, addresses,
  CMS pages, admin dashboard aggregations.
- **Razorpay** order creation + signature verification.
- **Cloudinary** image upload (multer memory storage).
- Helmet, CORS, rate limiting, centralized error handling.
- Seed script with demo catalog + admin/customer accounts.

### Admin (`apps/admin`)
- Dashboard: revenue, orders, customers, products, **7-day sales chart**, low-stock, recent orders.
- Modules: Product (full CRUD + image upload + variants), Category, Brand, Coupon, Banner,
  Order management (status updates), Customer list, Review moderation, CMS pages.

---

## 🧱 Tech Stack

| Layer    | Tech |
|----------|------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, Framer Motion, Swiper, GSAP, lucide-react |
| Admin    | Next.js 15, TypeScript, Tailwind CSS, Recharts |
| Backend  | Node.js, Express, MongoDB, Mongoose, JWT, bcrypt |
| Payments | Razorpay | 
| Media    | Cloudinary |

---

## 📂 Structure

```
novastyle-commerce/
├── apps/
│   ├── backend/        # Express + MongoDB REST API
│   │   ├── src/
│   │   │   ├── config/        # db, cloudinary, razorpay
│   │   │   ├── models/        # 12 Mongoose schemas
│   │   │   ├── controllers/   # business logic
│   │   │   ├── routes/        # express routers
│   │   │   ├── middleware/    # auth, error, upload
│   │   │   ├── utils/         # token, asyncHandler
│   │   │   ├── seed/          # demo data
│   │   │   ├── app.js         # express app
│   │   │   └── server.js      # entrypoint
│   │   └── test/              # integration test (in-memory mongo)
│   ├── frontend/       # Next.js storefront (port 3000)
│   └── admin/          # Next.js admin panel (port 3001)
└── package.json        # npm workspaces
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm 9+
- MongoDB (local `mongod`, Docker, or MongoDB Atlas)

### 1. Install
```bash
npm install            # installs all workspaces
```

### 2. Configure environment
Copy each example file and fill in values:
```bash
cp apps/backend/.env.example  apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
cp apps/admin/.env.example    apps/admin/.env.local
```
Minimum to run locally: set `MONGODB_URI` and `JWT_SECRET` in `apps/backend/.env`.
Razorpay/Cloudinary keys are optional — the app boots without them (online payment and
image upload are gracefully disabled until configured).

### 3. Seed demo data
```bash
npm run seed
```
Creates a demo catalog, banners, coupons (`NOVA10`, `FIRST500`, `FREESHIP`) and accounts:
- **Admin** — `admin@novastyle.test` / `admin123`
- **Customer** — `customer@novastyle.test` / `customer123`

### 4. Run (three terminals)
```bash
npm run dev:backend    # http://localhost:5000
npm run dev:frontend   # http://localhost:3000
npm run dev:admin      # http://localhost:3001
```

### 5. Test the API (optional)
An end-to-end integration test boots the real Express app against an in-memory MongoDB and
exercises auth → catalog → cart → coupon → order → reviews → admin dashboard:
```bash
npm --workspace apps/backend test
```

---

## 🔌 API Reference (selected)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | – | Create account |
| POST | `/api/auth/login` | – | Login (sets JWT cookie) |
| POST | `/api/auth/forgot-password` | – | Request reset token |
| POST | `/api/auth/reset-password` | – | Reset with token |
| GET  | `/api/products` | – | List w/ filters, sort, pagination |
| GET  | `/api/products/:idOrSlug` | – | Product + related |
| POST | `/api/products` | admin | Create |
| PUT/DELETE | `/api/products/:id` | admin | Update / delete |
| GET/POST | `/api/cart` | user | View / add item |
| POST | `/api/cart/coupon` | user | Apply coupon |
| GET/POST | `/api/wishlist` | user | View / toggle |
| GET/POST | `/api/orders` | user | List / create order |
| POST | `/api/orders/verify` | user | Verify Razorpay payment |
| GET  | `/api/admin/dashboard` | admin | Stats + charts |

Full route list (66 endpoints) is in `apps/backend/src/routes/`.

---

## 💳 Razorpay flow
1. `POST /api/orders` creates the order and a Razorpay order; returns `razorpayOrder` + key id.
2. Storefront opens Razorpay Checkout (`apps/frontend/src/lib/razorpay.ts`).
3. On success, `POST /api/orders/verify` validates the HMAC signature, marks the order paid,
   decrements stock, increments coupon usage, and clears the cart.

Use test keys from the Razorpay dashboard. Without keys, choose **Cash on Delivery**.

---

## 🖼️ Cloudinary
Set `CLOUDINARY_*` in the backend env. The admin Product form uploads via
`POST /api/upload` (admin-only, multipart `images`). Without keys, paste image URLs instead.

---

## 📦 Build
```bash
npm run build          # builds frontend + admin
```
Both Next.js apps build with **zero TypeScript errors**.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment.

---

## ⚠️ Notes & scope
- This is a substantial, working foundation covering the full stack and core commerce flows.
  Some areas are intentionally lightweight and ready for extension: real email/SMS sending
  (OTP/reset return the code in dev), social-login OAuth (UI present, wire up a provider),
  saved-cards storage (use a PCI-compliant vault — never store raw card data), and returns/
  refunds workflow (order status supports `returned`).
- Product images reference Unsplash for the demo; replace with your own Cloudinary assets.
