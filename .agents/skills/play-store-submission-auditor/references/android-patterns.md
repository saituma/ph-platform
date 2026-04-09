# Android Submission Patterns (Play Store)

Reference for Flutter, React Native, and native Android audits.

---

## Billing and subscriptions

### Bad pattern: digital access bought outside Play Billing

```kotlin
// BAD: opens external checkout for digital premium unlock
openUrl("https://checkout.example.com/premium")
```

```dart
// BAD: Stripe purchase for in-app digital feature
await stripe.confirmPayment(...)
```

### Good pattern

```kotlin
// GOOD: Google Play Billing flow for digital purchases
billingClient.launchBillingFlow(activity, billingFlowParams)
```

Check for clear subscription terms and cancellation guidance in app UI.

---

## Account deletion

### Required expectations
- In-app path to initiate account deletion.
- Support for external web deletion path (for store listing/data deletion requirements).

### Risk pattern

```kotlin
// BAD: "delete" only signs user out locally
auth.signOut()
```

### Better pattern

```kotlin
// GOOD: confirmed deletion request sent to backend + local cleanup
viewModel.confirmDeleteAccount()
api.deleteAccount(userId)
auth.signOut()
```

---

## Permissions request timing

### Bad pattern

```kotlin
// BAD: starts location tracking before runtime consent
startForegroundLocationService()
requestLocationPermission()
```

### Good pattern

```kotlin
// GOOD: request permission first, then start feature
requestLocationPermission { granted ->
  if (granted) startForegroundLocationService()
}
```

Use least-privilege: coarse over fine where possible, foreground over background where possible.

---

## Broad media/file access

### Risk patterns
- `READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO` requested for one-off upload only.
- `MANAGE_EXTERNAL_STORAGE` requested for generic picker behavior.

### Better alternatives
- Use Android system photo picker for one-off/infrequent selection.
- Use scoped storage APIs and explicit user selection where possible.

---

## Package visibility

### Risk pattern

```xml
<!-- Risky: broad visibility with unclear core need -->
<uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" />
```

Prefer targeted package queries/intents where possible.

---

## AccessibilityService

Use Accessibility only for legitimate accessibility support or fully disclosed approved use.

Red flags:
- automated decision/action execution unrelated to user benefit
- deceptive overlays or hidden behavior
- remote call audio recording via accessibility routes

---

## Sensitive SDK signals

Common SDK indicators that often require Data safety review:
- Firebase Analytics / Crashlytics
- AppsFlyer / Adjust / Branch
- Meta/Facebook SDKs
- ad SDKs (AdMob and others)
- session replay / screen analytics SDKs

Presence does not equal rejection by itself, but declarations must match behavior.

---

## Flutter and RN Android file anchors

Flutter:
- `android/app/src/main/AndroidManifest.xml`
- `android/app/build.gradle`
- `pubspec.yaml`
- `lib/main.dart`

React Native:
- `android/app/src/main/AndroidManifest.xml`
- `android/app/build.gradle`
- `package.json`
- JS/TS app entry and billing/auth/privacy modules

---

## Release-readiness anti-patterns

Flag these when found in user-facing flows:
- TODO/FIXME placeholders
- test endpoints or staging hostnames in release config
- broken settings/legal links
- dead navigation buttons
