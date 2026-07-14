# 🍽️ Savora — Premium Food Delivery Platform

> **Crave. Tap. Savor.** A production-ready, full-stack food delivery platform with a customer app, driver app, admin panel, and real-time backend.

Savora is an original, premium food-delivery brand — not a clone of any existing app. It ships with a warm-charcoal + ember design system, full dark mode, 60 FPS animations, and offline-aware data fetching.

## Monorepo Layout

```
├── apps/
│   ├── mobile/          # Customer app  — React Native + Expo + TypeScript
│   ├── driver/          # Driver app    — React Native + Expo + TypeScript
│   └── admin/           # Admin panel   — React + Vite + TypeScript
├── backend/             # API + realtime — Node.js + Express + MongoDB + Socket.io
└── docs/                # Architecture, API reference, store-submission guides
```

## Tech Stack

| Layer            | Technology |
|------------------|------------|
| Mobile           | React Native (Expo SDK 52), TypeScript, React Navigation 7 |
| State            | Zustand (client) + TanStack Query v5 (server cache, offline persist) |
| Forms            | React Hook Form + Zod |
| Auth             | Firebase Authentication (phone OTP + email) verified server-side |
| Backend          | Node.js 20, Express 4, TypeScript |
| Database         | MongoDB (Mongoose 8), geospatial indexes for nearby search |
| Realtime         | Socket.io (order status, live driver location) |
| Maps             | `react-native-maps` + Google Maps API, Directions polylines |
| Push             | Firebase Cloud Messaging via `expo-notifications` |
| Payments         | Razorpay (primary, INR) + Stripe (international) |
| Images           | `expo-image` with memory+disk caching and blurhash placeholders |

## Feature Matrix

**Customer app** — phone-OTP & email auth, home feed, restaurant search with debounce, category rails, filters (rating / price / veg / delivery time), restaurant details, menu browsing with item customization (variants + add-ons), cart with coupon engine, secure checkout (Razorpay/Stripe), live order tracking on a map with driver marker, push notifications, order history with reorder, wishlist, ratings & reviews, profile + saved addresses, i18n (EN/HI/ES), AI-assisted recommendations.

**Driver app** — online/offline toggle, incoming order accept/reject with countdown, pickup & drop navigation, background live-location publishing over Socket.io, earnings dashboard.

**Admin panel** — restaurant CRUD, menu management, live order board, driver approval & assignment, coupon manager, revenue reports & analytics charts.

## Quick Start

```bash
# 1. Backend
cd backend && cp .env.example .env && npm install && npm run seed && npm run dev

# 2. Customer app
cd apps/mobile && npm install && npx expo start

# 3. Driver app
cd apps/driver && npm install && npx expo start

# 4. Admin panel
cd apps/admin && npm install && npm run dev
```

## Verifying the build

Every package typechecks and builds; the backend also ships an end-to-end smoke suite:

```bash
# Backend: boots the real API + Socket.io against MongoDB and exercises
# discovery, auth, orders, coupons, payments math, driver dispatch,
# live tracking, reviews, recommendations, and admin analytics (~35 checks).
cd backend && npm run smoke                       # downloads an in-memory MongoDB, or:
MONGODB_URI=mongodb://127.0.0.1:27017/savora-test npm run smoke   # use your own Mongo

cd backend && npm run typecheck && npm run build  # → dist/
cd apps/admin && npm run typecheck && npm run build
cd apps/mobile && npm run typecheck && npx expo export --platform android
cd apps/driver && npm run typecheck && npx expo export --platform android
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [Android APK / AAB build & Play Store submission](docs/PLAY_STORE_RELEASE.md)
- [iOS build & App Store submission](docs/APP_STORE_RELEASE.md)

## License

Proprietary — all rights reserved.
