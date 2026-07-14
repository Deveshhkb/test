/**
 * End-to-end smoke test — boots the real API against an in-memory MongoDB
 * and exercises the core customer/driver/admin flows over HTTP + Socket.io.
 *
 *   npm run smoke
 *
 * No Firebase required: users are created directly in the DB and session
 * JWTs are signed with the same secret the server uses.
 */
import { spawn, ChildProcess } from 'child_process';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { io as ioClient, Socket } from 'socket.io-client';

const PORT = 4100;
const BASE = `http://127.0.0.1:${PORT}`;
const API = `${BASE}/api/v1`;
const JWT_SECRET = 'smoke-test-secret';

let passed = 0;
let failed = 0;
const check = (name: string, ok: boolean, detail?: unknown) => {
  if (ok) { passed += 1; console.log(`  ✓ ${name}`); }
  else { failed += 1; console.error(`  ✗ ${name}`, detail ?? ''); }
};

const req = async (
  method: string,
  path: string,
  opts: { token?: string; body?: unknown } = {},
) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return { status: res.status, json: (await res.json()) as { success: boolean; data: any; message?: string } };
};

const waitFor = async (fn: () => Promise<boolean>, label: string, timeoutMs = 30_000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await fn().catch(() => false)) return;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timed out waiting for ${label}`);
};

const run = async () => {
  // Prefer an externally provided MongoDB (Docker, local mongod, Atlas);
  // fall back to downloading an in-memory server binary.
  let mongod: MongoMemoryServer | null = null;
  let uri = process.env.MONGODB_URI ?? '';
  if (uri) {
    console.log(`▸ Using external MongoDB: ${uri}`);
  } else {
    console.log('▸ Starting in-memory MongoDB…');
    mongod = await MongoMemoryServer.create({
      binary: { version: process.env.MONGOMS_VERSION ?? '8.0.4' },
    });
    uri = mongod.getUri('savora');
  }
  const env = { ...process.env, MONGODB_URI: uri, JWT_SECRET, PORT: String(PORT), NODE_ENV: 'development' };

  console.log('▸ Seeding catalog…');
  await new Promise<void>((resolve, reject) => {
    const seed = spawn('npx', ['ts-node', '--transpile-only', 'src/seed/seed.ts'], { env, stdio: 'inherit' });
    seed.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`seed exited ${code}`))));
  });

  console.log('▸ Booting API server…');
  const server: ChildProcess = spawn('npx', ['ts-node', '--transpile-only', 'src/server.ts'], { env, stdio: 'inherit' });
  const cleanup = async () => {
    server.kill('SIGTERM');
    await mongoose.disconnect().catch(() => undefined);
    await mongod?.stop();
  };

  try {
    await waitFor(async () => (await fetch(`${BASE}/health`)).ok, 'server /health');

    // ---- Public discovery ----
    console.log('▸ Public API');
    const health = (await fetch(`${BASE}/health`).then((r) => r.json())) as { status: string };
    check('GET /health', health.status === 'ok');

    const cats = await req('GET', '/categories');
    check('GET /categories returns seeded categories', cats.json.data.length === 8, cats.json);

    const list = await req('GET', '/restaurants?limit=20');
    check('GET /restaurants lists seeded restaurants', list.json.data.items.length === 8, list.json);

    const search = await req('GET', '/restaurants?search=biryani');
    check('text search finds Dum Pukht House',
      search.json.data.items.some((r: any) => r.slug === 'dum-pukht-house'), search.json.data);

    const veg = await req('GET', '/restaurants?vegOnly=true');
    check('vegOnly filter', veg.json.data.items.every((r: any) => r.isVegOnly) && veg.json.data.items.length > 0);

    const near = await req('GET', '/restaurants?lat=12.9698&lng=77.5993');
    check('geo $near search', near.json.data.items.length > 0, near.json);

    const restaurant = list.json.data.items.find((r: any) => r.slug === 'ember-and-oak');
    const menu = await req('GET', `/restaurants/${restaurant._id}/menu`);
    check('GET menu grouped in sections', menu.json.data.length >= 3 && menu.json.data[0].items.length > 0);

    // ---- Users & auth’d flows (JWT signed directly, same as the server would) ----
    console.log('▸ Authenticated customer flow');
    await mongoose.connect(uri);
    const User = mongoose.connection.collection('users');
    const address = {
      _id: new mongoose.Types.ObjectId(),
      label: 'home', line1: '221B MG Road', city: 'Bengaluru', pincode: '560001',
      location: { type: 'Point', coordinates: [77.6, 12.97] }, isDefault: true,
    };
    const { insertedId: customerId } = await User.insertOne({
      name: 'Smoke Tester', role: 'customer', addresses: [address],
      wishlist: [], fcmTokens: [], language: 'en', isBlocked: false,
      createdAt: new Date(), updatedAt: new Date(),
    });
    const { insertedId: adminId } = await User.insertOne({
      name: 'Smoke Admin', role: 'admin', addresses: [], wishlist: [], fcmTokens: [],
      language: 'en', isBlocked: false, createdAt: new Date(), updatedAt: new Date(),
    });
    const { insertedId: driverUserId } = await User.insertOne({
      name: 'Smoke Rider', role: 'driver', addresses: [], wishlist: [], fcmTokens: [],
      language: 'en', isBlocked: false, createdAt: new Date(), updatedAt: new Date(),
    });
    const sign = (id: mongoose.Types.ObjectId, role: string) =>
      jwt.sign({ sub: id.toString(), role }, JWT_SECRET, { expiresIn: '1h' });
    const customer = sign(customerId, 'customer');
    const admin = sign(adminId, 'admin');
    const driverTok = sign(driverUserId, 'driver');

    const me = await req('GET', '/auth/me', { token: customer });
    check('GET /auth/me', me.json.data?.name === 'Smoke Tester');

    const noAuth = await req('GET', '/auth/me');
    check('401 without token', noAuth.status === 401);

    const wish = await req('POST', `/users/me/wishlist/${restaurant._id}`, { token: customer });
    check('wishlist toggle on', wish.json.data.wishlisted === true);

    // ---- Order lifecycle (COD → delivered) ----
    console.log('▸ Order lifecycle');
    const pizza = menu.json.data.flatMap((s: any) => s.items).find((i: any) => i.name === 'Margherita di Bufala');
    const cake = menu.json.data.flatMap((s: any) => s.items).find((i: any) => i.name === 'Basque Cheesecake');

    const orderRes = await req('POST', '/orders', {
      token: customer,
      body: {
        restaurantId: restaurant._id,
        items: [
          { menuItemId: pizza._id, quantity: 1, variant: 'Large 13"', addOns: ['Extra mozzarella'] },
          { menuItemId: cake._id, quantity: 2, addOns: [] },
        ],
        addressId: address._id.toString(),
        couponCode: 'FEAST100',
        paymentProvider: 'cod',
      },
    });
    const order = orderRes.json.data?.order;
    check('POST /orders (COD + coupon) returns 201', orderRes.status === 201, orderRes.json);
    // Large pizza 599 + mozzarella 79 = 678; cheesecake 249×2 = 498 → items 1176
    check('server-side pricing: itemsTotal', order?.pricing.itemsTotal === 1176, order?.pricing);
    check('coupon FEAST100 applied (−₹100)', order?.pricing.discount === 100, order?.pricing);
    const expectedTotal = 1176 - 100 + Math.round(1076 * 0.05) + restaurant.deliveryFee;
    check('grand total = items − discount + 5% tax + delivery fee',
      order?.pricing.grandTotal === expectedTotal, order?.pricing);
    check('COD order starts as placed', order?.status === 'placed');

    const badCoupon = await req('POST', '/orders', {
      token: customer,
      body: {
        restaurantId: restaurant._id,
        items: [{ menuItemId: cake._id, quantity: 1, addOns: [] }],
        addressId: address._id.toString(),
        couponCode: 'NOPE123',
        paymentProvider: 'cod',
      },
    });
    check('invalid coupon rejected',
      badCoupon.status === 400 && (badCoupon.json.message ?? '').includes('Invalid coupon'));

    const badTransition = await req('PATCH', `/orders/${order._id}/status`, {
      token: admin, body: { status: 'delivered' },
    });
    check('illegal status jump rejected', badTransition.status === 400);

    // ---- Live tracking over Socket.io ----
    console.log('▸ Socket.io realtime');
    const connect = (token: string): Promise<Socket> =>
      new Promise((resolve, reject) => {
        const s = ioClient(BASE, { transports: ['websocket'], auth: { token } });
        s.on('connect', () => resolve(s));
        s.on('connect_error', reject);
      });
    const customerSock = await connect(customer);
    const driverSock = await connect(driverTok);
    check('socket auth (customer + driver connected)', customerSock.connected && driverSock.connected);

    const rejected = await new Promise<boolean>((resolve) => {
      const bad = ioClient(BASE, { transports: ['websocket'], auth: { token: 'garbage' } });
      bad.on('connect', () => { bad.disconnect(); resolve(false); });
      bad.on('connect_error', () => resolve(true));
    });
    check('socket rejects bad JWT', rejected);

    customerSock.emit('order:watch', order._id);
    await new Promise((r) => setTimeout(r, 300));

    const statusEvent = new Promise<any>((resolve) => customerSock.once('order:update', resolve));
    for (const status of ['confirmed', 'preparing', 'ready_for_pickup'] as const) {
      const r = await req('PATCH', `/orders/${order._id}/status`, { token: admin, body: { status } });
      check(`status → ${status}`, r.status === 200 && r.json.data.status === status, r.json);
    }
    const evt = await Promise.race([statusEvent, new Promise((r) => setTimeout(() => r(null), 3000))]);
    check('customer socket received order:update', (evt as any)?.status === 'confirmed', evt);

    const locationEvent = new Promise<any>((resolve) => customerSock.once('driver:location', resolve));
    driverSock.emit('driver:location', { orderId: order._id, lat: 12.9701, lng: 77.6001 });
    const loc = await Promise.race([locationEvent, new Promise((r) => setTimeout(() => r(null), 3000))]);
    check('customer socket received driver:location', (loc as any)?.lat === 12.9701, loc);

    // ---- Driver assignment, delivery, earnings ----
    console.log('▸ Driver flow');
    const reg = await req('POST', '/drivers/register', {
      token: driverTok,
      body: { vehicleType: 'bike', vehicleNumber: 'KA01AB1234', licenseNumber: 'DL-42' },
    });
    check('driver registration', reg.status === 201);

    const approve = await req('PATCH', `/admin/drivers/${reg.json.data._id}/approve`, {
      token: admin, body: { isApproved: true },
    });
    check('admin approves driver', approve.json.data.isApproved === true);

    const online = await req('PATCH', '/drivers/me/status', {
      token: driverTok, body: { isOnline: true, lat: 12.969, lng: 77.599 },
    });
    check('driver goes online', online.json.data.isOnline === true);

    const accept = await req('POST', `/drivers/orders/${order._id}/accept`, { token: driverTok });
    check('driver claims order atomically', accept.status === 200, accept.json);
    const doubleAccept = await req('POST', `/drivers/orders/${order._id}/accept`, { token: driverTok });
    check('second claim rejected', doubleAccept.status === 409);

    for (const status of ['picked_up', 'on_the_way', 'delivered'] as const) {
      const r = await req('PATCH', `/orders/${order._id}/status`, { token: driverTok, body: { status } });
      check(`driver advances → ${status}`, r.status === 200, r.json);
    }

    const earnings = await req('GET', '/drivers/me/earnings', { token: driverTok });
    check('earnings credited after delivery',
      earnings.json.data.today > 0 && earnings.json.data.totalDeliveries === 1, earnings.json.data);

    // ---- Review, recommendations, admin analytics ----
    console.log('▸ Reviews, recommendations, analytics');
    const review = await req('POST', '/reviews', {
      token: customer,
      body: { orderId: order._id, rating: 5, foodRating: 5, comment: 'Fantastic wood-fired crust!' },
    });
    check('review on delivered order', review.status === 201);
    const dupReview = await req('POST', '/reviews', {
      token: customer, body: { orderId: order._id, rating: 4 },
    });
    check('duplicate review blocked', dupReview.status === 409);

    const updated = await req('GET', `/restaurants/${restaurant._id}`);
    check('restaurant rating folded in', updated.json.data.ratingCount === restaurant.ratingCount + 1);

    const recs = await req('GET', '/recommendations', { token: customer });
    check('personalized recommendations with reasons',
      recs.json.data.length > 0 && recs.json.data.every((r: any) => r._reason), recs.json.data?.[0]);

    const analytics = await req('GET', '/admin/analytics', { token: admin });
    check('admin analytics aggregates revenue',
      analytics.json.data.revenue30d === expectedTotal && analytics.json.data.orders30d >= 1,
      analytics.json.data);
    const forbidden = await req('GET', '/admin/analytics', { token: customer });
    check('admin routes blocked for customers', forbidden.status === 403);

    customerSock.disconnect();
    driverSock.disconnect();
  } finally {
    await cleanup();
  }

  console.log(`\n${failed === 0 ? '✅' : '❌'} smoke: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
};

run().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
