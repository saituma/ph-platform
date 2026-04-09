# First-Time Play Store Submission Checklist

Load this when user says this is their first Play submission.

---

## Before submission - hard blockers

These can block publishing before policy review starts.

- [ ] Play Console developer account is fully set up and verified
- [ ] App created in Play Console with final package name (cannot be reused later)
- [ ] Play App Signing configured
- [ ] Signed AAB upload works in a test track
- [ ] Privacy policy URL added in Play Console and accessible publicly
- [ ] App content declarations completed (Data safety, target audience, content rating)

---

## New personal account testing requirement

If personal account created after Nov 13, 2023:
- [ ] Closed test run with at least 12 opted-in testers
- [ ] Testers stayed opted-in for 14 continuous days
- [ ] Production access application completed in Play Console

Without this, production release can be blocked.

---

## Common first-time mistakes

| Mistake | Impact | Fix |
|---|---|---|
| Package name mismatch across builds | Upload/release confusion | Lock package name early and keep consistent |
| Data safety answers incomplete | Rejection or blocked update | Reconcile SDK/code behavior with form |
| Missing account deletion support with account creation | Policy violation | Add in-app deletion path and web deletion link |
| Target API out of date | Submission blocked or discoverability loss | Update targetSdk and test thoroughly |
| External checkout for digital features | Policy violation | Move digital purchases to Play Billing |
| No declaration for restricted permissions | Review failure | Complete required declaration forms |
| Store listing over-claims features | Metadata action/rejection | Make listing match real app behavior |

---

## Vibe coder version

If user is in plain-English mode, present:

1. Set up Play Console and Play App Signing first.
2. Upload a signed AAB to internal/closed test and make sure install works.
3. Fill app declarations honestly (Data safety + content rating + target audience).
4. If your app has login, you also need account deletion support.
5. If your developer account is new/personal, finish closed testing requirement before production.

Then continue with full strict audit.
