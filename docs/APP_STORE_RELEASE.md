# iOS Release Guide — App Store submission

Applies to `apps/mobile` (bundle ID `com.savora.app`).

## Prerequisites

- Apple Developer Program membership ($99/year) — https://developer.apple.com
- `GoogleService-Info.plist` from Firebase (iOS app with bundle ID `com.savora.app`) placed in `apps/mobile/`
- An iOS Google Maps key in `app.json → ios.config.googleMapsApiKey`

## Build

```bash
cd apps/mobile
eas build --platform ios --profile production
```

EAS can create and manage the distribution certificate and provisioning profile for you on first run (recommended — answer "yes" to the credential prompts). The output is a signed `.ipa`.

## Submit

```bash
eas submit --platform ios --profile production
```

Set `ascAppId` in `eas.json` (from App Store Connect → App Information → Apple ID) or let `eas submit` create the app record interactively.

## App Store Connect checklist

- App name, subtitle, keywords, description, support URL, marketing URL
- Screenshots: 6.9" (iPhone 16 Pro Max) and 6.5" sets minimum
- **App Privacy** nutrition labels: location, phone number, purchase history, device ID
- Sign in with Apple is **not** required (phone OTP is not a third-party social login)
- Background modes justification: remote notifications (customer app), location (driver app)
- Demo account + test instructions for App Review (include a test phone number with a fixed OTP configured in Firebase → Authentication → Phone → *Phone numbers for testing*)
- Export compliance: standard HTTPS encryption only → "exempt"

## TestFlight

Every `eas submit` build lands in TestFlight automatically after processing. Add internal testers (instant) or external testers (Beta App Review, ~24h) before pushing to production review.
