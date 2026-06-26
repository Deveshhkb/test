import { MongoMemoryServer } from 'mongodb-memory-server';

// Set MONGOMS_VERSION to pin a specific mongod build if auto-detection fails.
const mongod = await MongoMemoryServer.create(
  process.env.MONGOMS_VERSION ? { binary: { version: process.env.MONGOMS_VERSION } } : undefined
);
process.env.MONGODB_URI = mongod.getUri();
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
process.env.PORT = '5055';
process.env.FRONTEND_URL = 'http://localhost:3000';

const { connectDB } = await import('../src/config/db.js');
const appMod = await import('../src/app.js');
const mongoose = (await import('mongoose')).default;
const app = appMod.default;

await connectDB();
const server = app.listen(5055);
const base = 'http://127.0.0.1:5055/api';

let cookie = '';
const j = async (method, path, body, useCookie = true) => {
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(useCookie && cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setC = res.headers.get('set-cookie');
  if (setC) cookie = setC.split(';')[0];
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${extra}`); }
};

try {
  console.log('\n[health]');
  let r = await j('GET', '/health', null, false);
  check('health ok', r.status === 200 && r.data.status === 'ok');

  console.log('\n[auth]');
  r = await j('POST', '/auth/register', { name: 'Test User', email: 'test@x.com', password: 'secret1' });
  check('register returns token', r.status === 201 && !!r.data.token);
  const userId = r.data.user.id;

  r = await j('GET', '/auth/me');
  check('me returns user', r.status === 200 && r.data.user.email === 'test@x.com');

  // Promote to admin directly in DB so we can hit admin endpoints.
  await mongoose.model('User').findByIdAndUpdate(userId, { role: 'admin' });
  r = await j('GET', '/auth/me');
  check('user is now admin', r.data.user.role === 'admin');

  console.log('\n[catalog]');
  r = await j('POST', '/catalog/categories', { name: 'Men' });
  check('create category', r.status === 201 && r.data.category.slug === 'men');
  const catId = r.data.category._id;

  r = await j('POST', '/catalog/brands', { name: 'NovaBasics' });
  check('create brand', r.status === 201 && !!r.data.brand._id);
  const brandId = r.data.brand._id;

  console.log('\n[products]');
  r = await j('POST', '/products', {
    title: 'Oversized Tee',
    description: 'A great tee',
    price: 799,
    compareAtPrice: 1299,
    category: catId,
    brand: brandId,
    gender: 'unisex',
    sizes: ['S', 'M', 'L'],
    colors: [{ name: 'Black', hex: '#000' }],
    collections: ['trending'],
    variants: [{ sku: 'TEE-BK-M', color: 'Black', size: 'M', stock: 10 }],
  });
  check('create product', r.status === 201 && r.data.product.slug === 'oversized-tee', JSON.stringify(r.data));
  const productId = r.data.product._id;
  const variantId = r.data.product.variants[0]._id;
  check('product computes discountPercent', r.data.product.discountPercent === 38, `got ${r.data.product.discountPercent}`);

  r = await j('GET', '/products?collection=trending', null, false);
  check('list products (public)', r.status === 200 && r.data.products.length === 1);
  check('pagination present', r.data.pagination && r.data.pagination.total === 1);

  r = await j('GET', '/products/oversized-tee', null, false);
  check('get product by slug', r.status === 200 && r.data.product.title === 'Oversized Tee');

  console.log('\n[cart]');
  r = await j('POST', '/cart', { productId, variantId, quantity: 2, size: 'M', color: 'Black' });
  check('add to cart', r.status === 200 && r.data.cart.items.length === 1);
  check('cart summary subtotal', r.data.summary.itemsTotal === 1598, `got ${r.data.summary.itemsTotal}`);
  check('free shipping over 999', r.data.summary.shippingFee === 0);
  const itemId = r.data.cart.items[0]._id;

  r = await j('PUT', `/cart/item/${itemId}`, { quantity: 1 });
  check('update cart qty', r.data.summary.itemsTotal === 799);

  console.log('\n[coupon]');
  r = await j('POST', '/coupons', { code: 'NOVA10', type: 'percent', value: 10, minOrderValue: 500, maxDiscount: 300 });
  check('create coupon', r.status === 201);
  r = await j('POST', '/cart/coupon', { code: 'NOVA10' });
  check('apply coupon discount', r.data.summary.discount === 80, `got ${r.data.summary.discount}`);

  console.log('\n[wishlist]');
  r = await j('POST', '/wishlist', { productId });
  check('add to wishlist', r.status === 200 && r.data.added === true);
  r = await j('GET', '/wishlist');
  check('wishlist has product', r.data.wishlist.products.length === 1);

  console.log('\n[orders]');
  r = await j('POST', '/orders', {
    shippingAddress: { fullName: 'Test User', phone: '999', line1: 'A St', city: 'Pune', state: 'MH', pincode: '411001' },
    paymentMethod: 'cod',
  });
  check('create COD order', r.status === 201 && !!r.data.order.orderNumber, JSON.stringify(r.data).slice(0, 200));
  check('order total = 799 - 80 + 0 shipping', r.data.order.grandTotal === 719, `got ${r.data.order?.grandTotal}`);

  r = await j('GET', '/cart');
  check('cart cleared after order', r.data.cart.items.length === 0);

  r = await j('GET', '/orders');
  check('my orders lists the order', r.data.orders.length === 1);

  console.log('\n[admin]');
  r = await j('GET', '/admin/dashboard');
  check('admin dashboard', r.status === 200 && r.data.stats.products === 1);

  console.log('\n[reviews]');
  r = await j('POST', '/reviews', { productId, rating: 5, title: 'Love it', comment: 'Great' });
  check('create review (verified purchase)', r.status === 201 && r.data.review.verifiedPurchase === true);
  r = await j('GET', `/reviews/product/${productId}`, null, false);
  check('product reviews list', r.data.reviews.length === 1);
  r = await j('GET', '/products/oversized-tee', null, false);
  check('product rating synced to 5', r.data.product.ratingAverage === 5 && r.data.product.ratingCount === 1);

} catch (e) {
  console.error('SMOKE ERROR:', e);
  fail++;
} finally {
  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  await server.close();
  await mongoose.disconnect();
  await mongod.stop();
  process.exit(fail ? 1 : 0);
}
