# Savora — MongoDB Schema

Collections (Mongoose models in `backend/src/models/`). All documents carry `createdAt` / `updatedAt` timestamps. GeoJSON points are `[lng, lat]`.

## users

| Field | Type | Notes |
|---|---|---|
| firebaseUid | string | unique sparse index — links to Firebase Auth |
| name, email, phone, avatarUrl | string | email/phone sparse-indexed |
| role | enum | `customer` \| `driver` \| `admin` \| `restaurant_owner` |
| addresses[] | subdoc | `{ label, line1, line2, city, pincode, location(2dsphere), isDefault }` |
| wishlist[] | ObjectId → restaurants | |
| fcmTokens[] | string | max 5 devices, pruned at logout |
| language | string | `en`/`hi`/`es` |
| dietaryPreference | enum | veg / non_veg / vegan |
| isBlocked | boolean | blocks login + API access |

## restaurants

| Field | Type | Notes |
|---|---|---|
| name, slug | string | slug unique; text index on name+cuisines+tags |
| owner | ObjectId → users | optional |
| cuisines[], tags[] | string | cuisine indexed |
| categories[] | ObjectId → categories | |
| coverImageUrl, galleryUrls[] | string | |
| address, location | string, GeoJSON Point | **2dsphere index** → `$near` search |
| priceForTwo, deliveryFee, minOrderAmount | number | |
| rating, ratingCount | number | incrementally folded on new reviews |
| deliveryTimeMins | number | drives ETA |
| isVegOnly, isOpen, isActive | boolean | |
| openingHours[] | `{ day, open, close }` | |

## menuitems

| Field | Type | Notes |
|---|---|---|
| restaurant | ObjectId → restaurants | indexed |
| name, description, imageUrl | string | text index |
| section | string | menu grouping ("Starters") |
| basePrice | number | |
| variants[] | `{ name, price }` | sizes — price replaces base |
| addOns[] | `{ name, price }` | additive |
| isVeg, isBestseller, isAvailable | boolean | |
| spiceLevel | enum | mild / medium / hot |
| calories, orderCount | number | |

## orders

| Field | Type | Notes |
|---|---|---|
| orderNumber | string | unique, human-readable (`SV…`) |
| user / restaurant / driver | ObjectId | all indexed |
| items[] | snapshot | `{ menuItem, name, quantity, unitPrice, variant, addOns[], totalPrice }` — denormalized so history survives menu edits |
| status | enum | 9-state machine, indexed |
| statusHistory[] | `{ status, at }` | audit trail |
| deliveryAddress | snapshot + GeoJSON | |
| pricing | `{ itemsTotal, deliveryFee, taxes, discount, grandTotal }` | server-computed |
| coupon | `{ code, discount }` | |
| payment | `{ provider, status, providerOrderId, providerPaymentId }` | |
| eta | Date | |
| rated | boolean | one review per order |

## drivers

| Field | Type | Notes |
|---|---|---|
| user | ObjectId → users | unique — 1:1 with a `driver`-role user |
| vehicleType, vehicleNumber, licenseNumber | | |
| isApproved | boolean | gated by admin |
| isOnline | boolean | indexed |
| currentLocation | GeoJSON Point | **2dsphere** → nearest-driver dispatch |
| activeOrder | ObjectId → orders | one active delivery at a time |
| rating, ratingCount, totalDeliveries | number | |
| earnings[] | `{ date, amount, order }` | append-only payout ledger |

## coupons

`code` (unique, uppercase), `title`, `description`, `discountType` (percent/flat), `discountValue`, `maxDiscount`, `minOrderAmount`, `validFrom/validUntil`, `usageLimitPerUser`, `totalUsageLimit`, `usedCount`, `restaurant?` (null = platform-wide), `isActive`.

## reviews

`user`, `restaurant` (indexed), `order` (unique → one review per order), `rating` (1–5), `foodRating`, `deliveryRating`, `comment`, `photos[]`, `reply { text, at }`.

## categories

`name` (unique), `slug` (unique), `imageUrl`, `sortOrder`, `isActive`.

## Index summary

- Geospatial: `restaurants.location`, `drivers.currentLocation`, `users.addresses.location`
- Text search: `restaurants(name, cuisines, tags)`, `menuitems(name, description)`
- Uniqueness: `users.firebaseUid`, `restaurants.slug`, `orders.orderNumber`, `coupons.code`, `reviews.order`, `drivers.user`
