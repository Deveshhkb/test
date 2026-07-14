# Savora API Reference

Base URL: `/api/v1` · All responses: `{ "success": boolean, "data": …, "message"?: string }`
Auth: `Authorization: Bearer <savora-jwt>` (obtained from `/auth/firebase`).

## Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/firebase` | — | Exchange a Firebase ID token for a Savora JWT. Body: `{ idToken, name?, fcmToken? }` |
| GET | `/auth/me` | ✅ | Current user profile |
| POST | `/auth/logout` | ✅ | Remove this device's FCM token. Body: `{ fcmToken? }` |

## Discovery (public)

| Method | Path | Description |
|---|---|---|
| GET | `/categories` | Active categories, sorted |
| GET | `/restaurants` | List/search. Query: `search, category, cuisine, vegOnly, minRating, maxDeliveryTime, maxPriceForTwo, sort (rating/delivery_time/price_low/price_high/relevance), lat, lng, page, limit` |
| GET | `/restaurants/:id` | Restaurant details |
| GET | `/restaurants/:id/menu` | Menu grouped into sections `[{ title, items[] }]` |
| GET | `/restaurants/:id/reviews` | Paginated reviews |

## Orders

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/orders` | ✅ | Place an order. Body: `{ restaurantId, items:[{menuItemId, quantity, variant?, addOns[]}], addressId, couponCode?, paymentProvider (razorpay/stripe/cod), specialInstructions? }`. Returns `{ order, paymentIntent }` — prices are recomputed server-side. |
| GET | `/orders` | ✅ | My orders, newest first, paginated |
| GET | `/orders/:id` | ✅ | Order detail (owner, assigned driver, or admin) |
| POST | `/orders/:id/cancel` | ✅ | Cancel while still `pending_payment/placed/confirmed` |
| PATCH | `/orders/:id/status` | driver/admin/owner | Advance status along the whitelisted flow |

## Payments

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/payments/razorpay/verify` | ✅ | Verify checkout signature. Body: `{ razorpayOrderId, razorpayPaymentId, razorpaySignature }` |

## Profile, wishlist, coupons, reviews, recommendations

| Method | Path | Auth | Description |
|---|---|---|---|
| PATCH | `/users/me` | ✅ | Update `name, language, dietaryPreference, avatarUrl` |
| POST | `/users/me/addresses` | ✅ | Add address `{ label, line1, line2?, city, pincode, lat, lng, isDefault }` |
| DELETE | `/users/me/addresses/:addressId` | ✅ | Remove address |
| POST | `/users/me/wishlist/:restaurantId` | ✅ | Toggle wishlist |
| GET | `/users/me/wishlist` | ✅ | Wishlisted restaurants (populated) |
| GET | `/coupons` | ✅ | Currently valid coupons |
| POST | `/reviews` | ✅ | Review a delivered order `{ orderId, rating, foodRating?, deliveryRating?, comment?, photos? }` |
| GET | `/reviews/mine` | ✅ | My reviews |
| GET | `/recommendations` | ✅ | Personalized restaurant picks with `_reason` |
| POST | `/recommendations/also-ordered` | ✅ | Co-order suggestions `{ menuItemIds[] }` |

## Driver

| Method | Path | Description |
|---|---|---|
| POST | `/drivers/register` | Create driver profile `{ vehicleType, vehicleNumber, licenseNumber }` |
| GET | `/drivers/me` | My driver profile + active order |
| PATCH | `/drivers/me/status` | `{ isOnline, lat?, lng? }` (requires admin approval) |
| POST | `/drivers/orders/:id/accept` | Atomically claim an offered order |
| POST | `/drivers/orders/:id/reject` | Decline → re-dispatch to next nearest driver |
| GET | `/drivers/me/earnings` | `{ today, week, month, lifetime, totalDeliveries, rating, recent[] }` |

## Admin (role: admin)

| Method | Path | Description |
|---|---|---|
| POST/PATCH | `/admin/restaurants`, `/admin/restaurants/:id` | Create / update restaurants |
| PUT | `/admin/restaurants/:id/menu` | Upsert a menu item |
| GET | `/admin/orders?status=&page=` | Order board |
| GET | `/admin/drivers` · PATCH `/admin/drivers/:id/approve` | Driver management |
| GET/POST/PATCH | `/admin/coupons`, `/admin/coupons/:id` | Coupon management |
| GET | `/admin/analytics` | 30-day revenue, orders/day, top restaurants, status breakdown |

## Socket.io events

Handshake: `io(API_URL, { auth: { token: <savora-jwt> } })`

| Direction | Event | Payload |
|---|---|---|
| client → server | `order:watch` / `order:unwatch` | `orderId` |
| driver → server | `driver:location` | `{ orderId?, lat, lng }` |
| server → order room | `order:update` | `{ orderId, status, driverAssigned?, at }` |
| server → order room | `driver:location` | `{ orderId, lat, lng, at }` |
| server → driver | `order:offer` | `{ orderId, orderNumber, restaurantName, pickupAddress, dropAddress, payout, expiresInSec }` |

## Error format

```json
{ "success": false, "message": "Coupon has expired", "code": "COUPON_EXPIRED" }
```

Notable codes: `VALIDATION_ERROR`, `RESTAURANT_CLOSED`, `ITEM_UNAVAILABLE`, `MIN_ORDER`, `COUPON_*`, `BAD_TRANSITION`, `BAD_SIGNATURE`, `TOO_LATE`.
