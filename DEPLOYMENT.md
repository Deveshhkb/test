# Deployment Guide — NovaStyle

Three deployable units: **backend** (Express API), **frontend** (Next.js storefront), and
**admin** (Next.js panel). A typical setup:

- **Database**: MongoDB Atlas (free M0 tier works)
- **Backend**: Render / Railway / Fly.io / a VPS (Docker or bare Node)
- **Frontend & Admin**: Vercel (recommended for Next.js) — two separate projects
- **Media**: Cloudinary
- **Payments**: Razorpay (live keys)

---

## 1. MongoDB Atlas
1. Create a cluster → Database Access: add a user → Network Access: allow your backend host
   (or `0.0.0.0/0` for managed PaaS).
2. Copy the connection string into the backend `MONGODB_URI`.
3. After first deploy, seed once (locally pointed at Atlas, or via a one-off job):
   ```bash
   MONGODB_URI="<atlas-uri>" npm --workspace apps/backend run seed
   ```

---

## 2. Backend API

### Environment variables
```
NODE_ENV=production
PORT=5000
MONGODB_URI=<atlas-uri>
JWT_SECRET=<long-random-string>
JWT_EXPIRES_IN=7d
CORS_ORIGINS=https://shop.yourdomain.com,https://admin.yourdomain.com
FRONTEND_URL=https://shop.yourdomain.com
RAZORPAY_KEY_ID=<live-or-test>
RAZORPAY_KEY_SECRET=<secret>
CLOUDINARY_CLOUD_NAME=<name>
CLOUDINARY_API_KEY=<key>
CLOUDINARY_API_SECRET=<secret>
```

### Render / Railway
- Root directory: `apps/backend`
- Build: `npm install`
- Start: `npm start`
- Add the env vars above.

### Docker (any host)
```dockerfile
# apps/backend/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY apps/backend/package*.json ./
RUN npm install --omit=dev
COPY apps/backend ./
EXPOSE 5000
CMD ["node", "src/server.js"]
```
```bash
docker build -f apps/backend/Dockerfile -t novastyle-api .
docker run -p 5000:5000 --env-file apps/backend/.env novastyle-api
```

> **CORS & cookies**: auth uses an httpOnly cookie with `SameSite=None; Secure` in production,
> so the API **must** be served over HTTPS and every storefront/admin origin must be listed in
> `CORS_ORIGINS`.

---

## 3. Frontend & Admin (Vercel)

Create **two** Vercel projects from the same repo:

| Project  | Root directory  | Env |
|----------|-----------------|-----|
| Storefront | `apps/frontend` | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` |
| Admin      | `apps/admin`    | `NEXT_PUBLIC_API_URL` |

Example storefront env:
```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_SITE_URL=https://shop.yourdomain.com
NEXT_PUBLIC_RAZORPAY_KEY_ID=<key-id>
```
Build command `npm run build`, output is auto-detected by Vercel. Each app pins its own port
in dev (`3000` / `3001`) but Vercel manages ports in production.

> Because this is an npm-workspaces monorepo, set the **Root Directory** per Vercel project and
> leave "Include source files outside the Root Directory" enabled so the lockfile resolves.

---

## 4. Razorpay (production)
1. Complete KYC, switch to **Live mode**, generate live API keys.
2. Set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` on the backend and
   `NEXT_PUBLIC_RAZORPAY_KEY_ID` on the storefront.
3. (Optional) Add a webhook for `payment.captured` for extra reconciliation; the app already
   verifies the signature client-to-server on `POST /api/orders/verify`.

---

## 5. Cloudinary
Create an account, copy cloud name / API key / secret into the backend env. Admin image
uploads then stream directly to Cloudinary; URLs are stored on products.

---

## 6. Post-deploy checklist
- [ ] `GET https://api.yourdomain.com/api/health` returns `{ status: "ok" }`
- [ ] Storefront home loads products (DB seeded)
- [ ] Register / login works (cookie set, `Secure` + `SameSite=None`)
- [ ] Admin login at the admin domain (use the seeded admin, then change its password)
- [ ] Place a test order with a Razorpay **test** card before going live
- [ ] `sitemap.xml` and `robots.txt` resolve on the storefront domain
- [ ] Rotate `JWT_SECRET` and the seeded admin credentials

---

## 7. Performance tips
- Storefront pages use ISR (`revalidate`) — tune per route.
- Serve the API behind a CDN/edge cache for `GET /api/products*` (already `Cache-Control`-friendly).
- Enable Cloudinary auto-format/quality (`f_auto,q_auto`) on delivered URLs.
- Add a MongoDB index review for your real query patterns (text + compound indexes are defined
  on `Product`).
