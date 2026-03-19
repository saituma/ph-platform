# Fitness Coaching App Spec Gap Checklist

Generated: 2026-02-17

## Implemented
- [x] Bottom tab navigation (Home, Programs, Messages, Parent Platform, Schedule, More)
  - `apps/mobile/app/(tabs)/_layout.tsx`
- [x] Auth + onboarding flow gating
  - `apps/mobile/app/(auth)/login.tsx`
  - `apps/mobile/app/(tabs)/onboarding/register.tsx`
  - `apps/mobile/hooks/onboarding/useRegisterController.ts`
  - `apps/api/src/controllers/onboarding.controller.ts`
- [x] Onboarding config driven fields (admin)
  - `apps/api/src/services/onboarding.service.ts`
  - `apps/web/app/parent/page.tsx`
- [x] Legal acceptance recorded w/ timestamp + versions
  - `apps/api/src/db/schema.ts`
  - `apps/api/src/services/onboarding.service.ts`
- [x] Home content delivered from API
  - `apps/mobile/app/(tabs)/index.tsx`
  - `apps/api/src/controllers/content.controller.ts`
- [x] Programs list + program detail sessions
  - `apps/mobile/app/(tabs)/programs.tsx`
  - `apps/mobile/app/programs/[id].tsx`
  - `apps/api/src/controllers/program.controller.ts`
- [x] Food diary submit + admin review
  - `apps/mobile/components/programs/ProgramPanels.tsx`
  - `apps/api/src/controllers/food-diary.controller.ts`
  - `apps/web/app/food-diary/page.tsx`
- [x] Video upload + coach review
  - `apps/mobile/components/programs/ProgramPanels.tsx`
  - `apps/api/src/controllers/video.controller.ts`
  - `apps/web/app/video-review/page.tsx`
- [x] Parent Platform content + tier gating + preview
  - `apps/mobile/app/(tabs)/parent-platform.tsx`
  - `apps/api/src/services/content.service.ts`
  - `apps/web/app/parent/page.tsx`
- [x] Booking flow + service types + capacity + 13:00 role model rule
  - `apps/mobile/app/(tabs)/schedule.tsx`
  - `apps/api/src/services/booking.service.ts`
  - `apps/web/app/bookings/page.tsx`
- [x] Premium priority sorting + badges in messaging
  - `apps/mobile/hooks/useMessagesController.ts`
  - `apps/mobile/components/messages/InboxScreen.tsx`
  - `apps/web/app/messaging/page.tsx`
- [x] Admin user management + onboarding review
  - `apps/web/app/users/page.tsx`
- [x] Physio referrals admin management
  - `apps/web/app/physio-referrals/page.tsx`
  - `apps/api/src/controllers/physio-referral.controller.ts`

## Partial / Needs Review
- [ ] Legal content editable in admin and displayed in mobile (currently hardcoded in mobile; admin content page disabled)
  - `apps/mobile/app/terms.tsx`
  - `apps/mobile/app/privacy-policy.tsx`
  - `apps/web/app/content/page.tsx`
  - `apps/web/components/admin/content/content-tabs.tsx`
- [ ] Onboarding sends configurable `termsVersion`, `privacyVersion`, `appVersion` (currently hardcoded)
  - `apps/mobile/hooks/onboarding/useRegisterController.ts`
- [ ] Admin Programs page wired to backend templates and assignments (UI uses static list)
  - `apps/web/app/programs/page.tsx`
  - `apps/api/src/services/admin.service.ts`
- [ ] Video feedback enhancements (coach video replies not found)
  - `apps/api/src/services/video.service.ts`
  - `apps/web/app/video-review/page.tsx`

## Missing / Not Found
- [x] Push notifications for new messages (server-side trigger)
  - Implemented in `apps/api/src/services/message.service.ts` via `sendPushNotification` after `sendMessage` (human ↔ human; skipped for AI coach thread).
- [ ] Premium response-time indicator (optional in spec)
  - No UI or API support found

## Suggested Priority Order
1. Legal content management end-to-end (admin -> API -> mobile display)
2. Replace hardcoded legal/app versions in onboarding with config-driven values
3. Wire admin Programs page to backend templates/assignments
4. ~~Add message push notification pipeline~~ (done — see `message.service.ts`)
5. Optional: premium response-time indicator
6. Optional: coach video reply feature

## Recent product / UX additions
- [x] Program detail: unified **Warm-up / Cool-down** labels + PHP Plus tab normalization from API (`normalizeProgramTabLabel`)
- [x] **Today’s training** step row (PHP / Plus) to jump tabs in order
- [x] **Message coach** from program content cards + Premium plan exercises (prefilled draft; opens thread with `draft` query)
- [x] Admin **Client training** snapshot: `GET /admin/training-snapshot`, web `/training-snapshot`
