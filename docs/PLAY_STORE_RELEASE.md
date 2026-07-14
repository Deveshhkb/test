# Android Release Guide — APK & AAB for the Play Store

This guide builds the **Savora customer app** (`apps/mobile`). The same steps apply to the driver app (`apps/driver`) with its own package name (`com.savora.rider`).

## 0. One-time prerequisites

```bash
npm install -g eas-cli
cd apps/mobile
npm install
eas login                    # Expo account
eas init                     # links the project, writes the real projectId into app.json
```

Also required before any release build:

1. **Firebase** — create an Android app in the Firebase console with package name `com.savora.app`, download `google-services.json` into `apps/mobile/`, and add your SHA-1/SHA-256 fingerprints (get them with `eas credentials`) so phone-OTP auth works.
2. **Google Maps** — put a real Android Maps SDK key in `app.json → android.config.googleMaps.apiKey`.
3. **API URL** — set the production backend URL in `app.json → extra.apiUrl`.

## 1. Signing keys

Let EAS manage the upload keystore (recommended):

```bash
eas credentials
# → Android → production → "Set up a new keystore"
```

EAS generates, stores, and reuses the keystore on every build. Google Play App Signing then re-signs with Google's key, so the keystore in EAS is only your **upload key** — if it ever leaks, you can rotate it in the Play Console.

## 2. Build an APK (for direct install / QA / sideloading)

```bash
npm run build:android:apk
# = eas build --platform android --profile preview
```

- Uses the `preview` profile in `eas.json` (`buildType: "apk"`).
- When the build finishes, EAS prints a URL — download the `.apk` and install it on any device (`adb install savora.apk`).
- APKs are for testing and internal distribution only; **the Play Store requires an AAB**.

## 3. Build an AAB (Android App Bundle — Play Store submission format)

```bash
npm run build:android:aab
# = eas build --platform android --profile production
```

- Uses the `production` profile (`buildType: "app-bundle"`, `autoIncrement: true` so `versionCode` bumps automatically on every build).
- Output is an `.aab` file — this is what you upload to Google Play.

### Local build (no EAS servers, optional)

```bash
npx expo prebuild --platform android     # generates the native android/ project
cd android
./gradlew bundleRelease                  # AAB → android/app/build/outputs/bundle/release/
./gradlew assembleRelease                # APK → android/app/build/outputs/apk/release/
```

For local builds you must configure your own keystore in `android/app/build.gradle` (`signingConfigs`).

## 4. Play Console setup (first release)

1. Create a developer account at https://play.google.com/console ($25 one-time fee).
2. **Create app** → name "Savora", App/Free, category *Food & Drink*.
3. Complete the mandatory declarations:
   - **Privacy policy URL** (required — the app collects location, phone number, payment info).
   - **Data safety form**: declare location (delivery), phone (auth), payment info (Razorpay/Stripe handle card data — mark as "processed ephemerally by a payment processor"), device ID (FCM).
   - **Content rating** questionnaire, **target audience** (18+ recommended for payments), **ads declaration** (none).
4. Store listing: title (≤30 chars), short description (≤80), full description (≤4000), screenshots for phones (min 2, 1080×1920 recommended), 512×512 icon, 1024×500 feature graphic.

## 5. Upload & roll out

**Manual:** Play Console → *Testing → Internal testing* → *Create new release* → upload the `.aab` → add release notes → save → promote through Closed → Open → Production once validated.

**Automated (recommended):**

```bash
# One-time: create a Google Cloud service account with "Release Manager" role
# in Play Console → API access, download its JSON key as
# apps/mobile/play-store-service-account.json (gitignored).

npm run submit:android
# = eas submit --platform android --profile production
# uploads the latest AAB to the "internal" track (see eas.json)
```

## 6. Release checklist

- [ ] `versionCode` incremented (automatic with `autoIncrement`)
- [ ] Production API URL + real Maps/Firebase keys in `app.json`
- [ ] ProGuard/R8 shrinking on (default in release builds)
- [ ] Push notifications tested on a physical device (FCM needs real hardware)
- [ ] Razorpay in **live mode** keys on the backend
- [ ] Deep links (`savora://`) verified
- [ ] Tested on Android 8 (minSdk) and the latest Android
- [ ] Privacy policy & account-deletion URL live (Play policy requires an in-app or web account-deletion path)

## Updating the app later

- **JS-only changes** can ship instantly with EAS Update (OTA): `eas update --channel production`.
- **Native changes** (new libraries, permission changes) require a new AAB through steps 3–5.
