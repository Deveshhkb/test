# Running Savora Locally

## Prerequisites

- Node.js 20+ and npm
- MongoDB — easiest via Docker: `docker run -d --name savora-db -p 27017:27017 mongo:8`
- For the phone apps: Android Studio (SDK + emulator) or a physical device with USB debugging

## 1. Backend (start first)

```bash
cd backend
cp .env.example .env        # defaults target mongodb://127.0.0.1:27017/savora
npm install
npm run seed                # 8 restaurants, menus, categories, 3 coupons
npm run dev                 # API on http://localhost:4000
```

Verify: http://localhost:4000/health and http://localhost:4000/api/v1/restaurants.

Firebase / Razorpay keys are **optional locally** — the server boots without them.
OTP login and online payments need real keys; Cash-on-Delivery orders work immediately.

## 2. Admin panel

```bash
cd apps/admin
npm install
npm run dev                 # http://localhost:5173 (proxies /api + sockets to :4000)
```

Generate an admin JWT for the sign-in box (run from `backend/`):

```bash
npx ts-node --transpile-only -e "
const mongoose = require('mongoose'); const jwt = require('jsonwebtoken');
require('dotenv').config();
(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/savora');
  const r = await mongoose.connection.collection('users').insertOne({
    name: 'Local Admin', role: 'admin', addresses: [], wishlist: [], fcmTokens: [],
    language: 'en', isBlocked: false, createdAt: new Date(), updatedAt: new Date() });
  console.log(jwt.sign({ sub: r.insertedId.toString(), role: 'admin' },
    process.env.JWT_SECRET || 'dev-only-secret', { expiresIn: '30d' }));
  await mongoose.disconnect();
})()"
```

## 3. Customer & driver apps

**Point the app at your machine** — edit `apps/mobile/app.json → extra.apiUrl`:

| Where the app runs | apiUrl |
|---|---|
| Android emulator | `http://10.0.2.2:4000` |
| Physical device (same Wi-Fi) | `http://<your-LAN-IP>:4000` |

**Expo Go will not work** — the apps use native modules (Firebase, Maps, Razorpay),
so build a development client instead:

One-time Firebase setup (required for OTP login):
1. Create a Firebase project → add an Android app with package `com.savora.app`.
2. Enable **Authentication → Phone**; add a test number under *Phone numbers for
   testing* (e.g. `+91 9999999999` / OTP `123456`) to log in without real SMS.
3. Download `google-services.json` into `apps/mobile/`.
4. Put a Google Maps Android key in `app.json → android.config.googleMaps.apiKey`.

```bash
cd apps/mobile
npm install
npx expo run:android        # or: eas build --profile development (cloud build)
```

Same steps for `apps/driver` (package `com.savora.rider`, its own `extra.apiUrl`).

## 4. End-to-end walkthrough

1. Backend + Mongo running, seed loaded.
2. Customer app: log in with the Firebase test number → add to cart →
   checkout with **Cash on Delivery**.
3. Admin panel: order appears on the live board → **Confirm**.
4. Driver app (second test number): register as driver → approve in admin →
   go online → accept the offer → advance to delivered. The customer's
   tracking map updates live over Socket.io.

## Automated check

```bash
cd backend
MONGODB_URI=mongodb://127.0.0.1:27017/savora-test npm run smoke
```

Runs ~35 end-to-end assertions (orders, coupons, dispatch, sockets, analytics)
against your local MongoDB.
