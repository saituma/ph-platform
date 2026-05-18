# App Store Review Notes - PH Performance

Last updated: 2026-05-18

## Submission Status

- Demo reviewer accounts: ACTIVE before submission, but passwords must be provided manually in App Store Connect.
- Backend: LIVE at `https://ph-performance-2cae29f7922d.herokuapp.com/api`.
- iOS purchases: none. The iOS app has no purchase, checkout, upgrade, pricing, billing, Stripe, or external payment links.
- Access model: account access and programme access are provisioned by the PH Performance coaching team.
- Primary reviewer account type: youth athlete/guardian account. Youth accounts use age-based training modules and content rather than adult coach-assigned programs.
- Register flow: uses `WebBrowser.openAuthSessionAsync`, which maps to ASWebAuthenticationSession on iOS.
- Account deletion: available in-app at More -> Privacy & Security.

## Demo / Review Credentials

Do not commit real passwords unless this repository is being used as a private submission-notes workspace. Prefer entering real passwords directly in App Store Connect.

| Purpose | Email | Password |
|---|---|---|
| Primary reviewer athlete account | `review@phperformance.uk` | `<ENTER_IN_APP_STORE_CONNECT_ONLY>` |
| Optional manager/team account | `manager-review@phperformance-demo.com` | `<ENTER_IN_APP_STORE_CONNECT_ONLY>` |
| Optional delete-test account | `delete-review@phperformance-demo.com` | `<ENTER_IN_APP_STORE_CONNECT_ONLY>` |

Use the delete-test account only if Apple asks to verify account deletion end to end, because deletion is permanent.

## Local Backend Liveness QA

Run this before resubmitting:

```sh
PH_REVIEW_EMAIL="review@phperformance.uk" \
PH_REVIEW_PASSWORD="<password>" \
pnpm --filter mobile verify:app-store-review
```

Optional override:

```sh
PH_API_BASE_URL="https://ph-performance-2cae29f7922d.herokuapp.com/api" \
PH_REVIEW_EMAIL="review@phperformance.uk" \
PH_REVIEW_PASSWORD="<password>" \
pnpm --filter mobile verify:app-store-review
```

The script checks:

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/auth/me`
- Youth account path: `GET /api/training-content-v2/mobile`
- Adult athlete account path: `GET /api/programs/my-assigned`
- Manager/team account path: `GET /api/team/roster`

The primary reviewer account is a youth account, so `/programs/my-assigned` returning zero adult assigned programs is expected. The verification script requires the youth account to have age-based modules, sessions, and visible reviewable content from `/training-content-v2/mobile`.

## Auth And Account Management

All authentication and account-management flows are handled without opening the system default browser.

| Flow | Implementation | File |
|---|---|---|
| Sign In | Native in-app email/password form | `app/(auth)/login.tsx` |
| Register / Create Account | `WebBrowser.openAuthSessionAsync` -> ASWebAuthenticationSession on iOS | `app/(auth)/login.tsx`, `lib/auth/openRegisterSession.ts` |
| Forgot Password | Native in-app form | `app/(auth)/forgot.tsx` |
| Reset Password | Native in-app form | `app/(auth)/reset-password.tsx` |
| Change Password | Native in-app form | `app/(auth)/change-password.tsx` |
| Delete Account | Native in-app modal + native confirmation alert | `app/privacy-security.tsx` |

Register flow detail:

1. The app opens `https://phperformance.uk/register?from_mobile=1` with `WebBrowser.openAuthSessionAsync`.
2. iOS presents ASWebAuthenticationSession inside the app context.
3. On completion, the web flow redirects to `phperformance://auth/registered`.
4. The auth session closes and the app shows a native confirmation toast.

Account deletion flow:

1. User opens More -> Privacy & Security.
2. User taps Delete my account.
3. User enters current password in an in-app modal.
4. User confirms in a native alert.
5. App calls `POST /auth/delete-account`.
6. App clears local auth tokens and returns to login.

## Payment / IAP Position

The iOS app does not sell digital coaching content, programmes, subscriptions, premium access, upgrades, or any other digital feature.

The mobile app does not present Stripe checkout, a billing portal, pricing pages, subscription purchase buttons, upgrade buttons, or external payment links. Athlete and team access is managed by the PH Performance coaching team outside the iOS app.

## Background Location Position

Background location is used only for optional run tracking so a route, distance, and pace can continue recording if the user locks the screen or switches apps during a run.

It is not requested at app launch. The app asks for foreground location during the run flow. Background location is requested only after the user starts a run and accepts an in-app disclosure. If denied, the app remains usable and runs can still be tracked while the app is open.

## App Store Connect Review Notes - Paste Text

```text
PH Performance reviewer accounts are active and the backend is live.

Primary reviewer athlete account:
Email: review@phperformance.uk
Password: <PASTE_REAL_PASSWORD_IN_APP_STORE_CONNECT>

Optional manager/team account:
Email: manager-review@phperformance-demo.com
Password: <PASTE_REAL_PASSWORD_IN_APP_STORE_CONNECT>

Optional delete-test account:
Email: delete-review@phperformance-demo.com
Password: <PASTE_REAL_PASSWORD_IN_APP_STORE_CONNECT>

PH Performance requires a pre-existing coaching account. Access is provisioned by the PH Performance coaching team.

The primary reviewer account is a youth athlete/guardian account. Youth accounts use age-based training modules and content instead of adult coach-assigned programs. Adult assigned programs are not required for this reviewer account type. The review account has age-based training content available in the app.

The iOS app has no purchase, checkout, upgrade, pricing, billing, Stripe, or external payment links. It does not sell digital coaching content, subscriptions, premium access, or digital features in the iOS app.

Authentication/account-management notes:
- Sign in is a native in-app email/password form.
- Register uses ASWebAuthenticationSession via WebBrowser.openAuthSessionAsync and returns to phperformance://auth/registered.
- Forgot Password, Reset Password, and Change Password are native in-app flows.
- Account deletion is available in-app at More -> Privacy & Security. The user enters their password, confirms with a native alert, the API deletes the account, local tokens are cleared, and the app returns to login.

Background location is optional and used only during a run the user starts, so route, distance, and pace can continue recording if the screen locks or the user switches apps. If background location is denied, the app remains usable and run tracking still works while the app is open.
```
