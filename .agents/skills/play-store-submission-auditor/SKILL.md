---
name: play-store-submission-auditor
description: "Audits Android apps for Google Play submission and policy risks with evidence-backed findings and declaration guidance."
---

# Play Store Submission Auditor

Scans a project for Google Play rejection and enforcement risks. Read code first,
then return a full audit in one response.

Default posture: STRICT mode.

---

## First-time developer flow

If user says "first app", "first time submitting", "new developer", or "never submitted before":
- Load `references/first-time-dev.md`
- Run that checklist first
- Continue with full audit

---

## Config memory

Look for `config.json` in this skill folder.

If it exists, load prior known values:
- mode, stack, app type, risky permissions, billing type, regions, first-time status,
  previous declaration gaps, last audit date, fixed issues.

If missing, create after first audit with detected values.

Template:

```json
{
  "mode": "vibe_coder",
  "strict_mode": true,
  "stack": "flutter",
  "uses_play_billing": true,
  "has_subscriptions": true,
  "has_ugc": false,
  "targets_children": false,
  "uses_sensitive_permissions": [],
  "has_data_safety_risk": true,
  "first_time_submitter": false,
  "last_audit": "2026-04-07",
  "issues_fixed": [],
  "issues_outstanding": []
}
```

On later runs, reuse known values and report fixed issue count.

---

## False-positive guardrails

Check these before flagging:

1) Physical goods and real-world services can use external processors
- Do not flag Stripe/PayPal as violation if payment is for physical goods/services.
- Flag only when digital goods/features bypass Play Billing.

2) WebView is allowed for limited content
- Do not flag a supplemental webview as wrapper app.
- Flag only when primary app experience is basically web content.

3) Broad media permissions may be valid for core media apps
- `READ_MEDIA_IMAGES`/`READ_MEDIA_VIDEO` can be valid when persistent/frequent
  shared-storage access is core.
- If unclear, mark "Assumption - verify declaration evidence".

4) Background location can be valid for core safety/navigation use cases
- Flag when background location appears non-essential or unsupported by clear user value.

5) Data safety mismatch is not always provable from code alone
- Use confidence values.
- Where evidence is incomplete, mark assumption and manual verification task.

6) UGC moderation requirements vary by interaction model
- Report/block expectations depend on public UGC vs 1:1 messaging vs closed communities.

7) Families policy checks depend on declared target audience
- If app looks child-appealing but target audience is unknown, mark as P1 with
  "verify Target Audience and Content declarations".

---

## Step 1 - Detection phase

### A) Mode detection

Vibe coder signals:
- "built with AI", "Cursor", "Bolt", "Claude Code", vague file references,
  non-technical wording.

Technical signals:
- framework and file names, policy terms, manifest/gradle references,
  code snippets.

Default: vibe coder mode.

### B) Stack detection
- `pubspec.yaml` + `android/` -> Flutter
- `package.json` + `android/` -> React Native
- `app/build.gradle*` or `build.gradle*` + `AndroidManifest.xml` -> Native Android

If Flutter or React Native, load `references/android-patterns.md`.

### C) Mid-build detection

Signal as mid-build when 2 or more:
- many TODO/FIXME/placeholder user strings
- missing core navigation/feature flows
- fake/mock functions in production paths
- very limited screen count

If mid-build detected, pause and ask:

"Your app looks in-progress based on [signals]. Which do you want?
A) Submission audit - strict policy/review risks now
B) Build checklist - finish critical product work first"

If A -> continue full audit and note app is mid-build.
If B -> run Build Checklist mode.

---

## Step 2 - Announce mode and strictness

Vibe coder:
- "Running in plain English mode with strict compliance checks and copy-paste fixes."

Technical:
- "Running in developer mode with strict compliance checks and evidence-based findings."

Always state strict mode is enabled by default.

---

## Step 3 - Scan these files

Read without asking. If missing, note and continue.

Core Android files:
- `AndroidManifest.xml` (all modules/flavors)
- `app/build.gradle` / `app/build.gradle.kts`
- root `build.gradle*`, `gradle.properties`, `settings.gradle*`
- `proguard-rules.pro`
- `res/xml/*` (network security config, file provider, backup rules)
- `res/values/strings.xml`
- `google-services.json` (if present)

Flutter:
- `pubspec.yaml`
- `lib/main.dart`
- Android module gradle + manifest

React Native:
- `package.json`
- `android/app/src/main/AndroidManifest.xml`
- `android/app/build.gradle`

Policy-sensitive patterns (glob/grep):
- auth/account/delete/block/report/chat/social/ugc
- billing/subscription/purchase/paywall/coins/gems/credits
- privacy/policy/legal/terms/consent/disclosure
- location/background/service/foreground/permission
- media/file/storage/package visibility/accessibility
- analytics/ads/attribution/tracking SDKs
- webview/browser/url handling/deep links

---

## Step 4 - What to check

Collect findings silently. Output once in Step 5.

Severity:
- P0 = likely immediate rejection/blocked update
- P1 = high review/enforcement risk
- P2 = quality/compliance hardening

### 4.1 Target API and platform compliance

Flag:
- targetSdk below current Play requirement for new submissions/updates -> P0
- targetSdk close to deadline with no migration notes -> P1
- outdated compile/toolchain likely to block API migration -> P1

### 4.2 Data safety and privacy consistency

Use `references/data-safety-mapping.md`.

Flag:
- likely collected/shared data with no visible privacy disclosure assets -> P1
- tracking/analytics/ads SDK signals with no matching privacy policy paths -> P1
- sensitive data access patterns with missing prominent disclosure flow -> P0/P1 based on impact
- declared "optional" style flow in code appears mandatory -> P1

### 4.3 Privacy policy and account deletion

Flag:
- account creation exists but no in-app deletion path found -> P0
- no evidence of web deletion path support -> P1
- delete flow only deactivates account with no data deletion explanation -> P1

### 4.4 Payments and subscriptions

Flag:
- digital goods/features using external payments -> P0
- in-app flows linking users to external checkout for digital content -> P0
- unclear subscription terms, auto-renew disclosure, or cancellation guidance -> P1
- no easy subscription management link/path in settings/account -> P1
- one-time benefit disguised as recurring subscription value -> P1

### 4.5 Sensitive permissions and declarations

Flag by permission/API pattern:
- SMS/Call Log permissions without default handler evidence -> P0
- background location without core feature evidence -> P1
- `MANAGE_EXTERNAL_STORAGE` without clear critical core use -> P0
- `READ_MEDIA_*` broad access without persistent core need -> P1
- `QUERY_ALL_PACKAGES` without approved interoperability use case -> P1
- AccessibilityService misuse or deceptive automation cues -> P0
- `REQUEST_INSTALL_PACKAGES` for non-permitted use -> P0
- body sensor/health permissions used for non-health purposes -> P0

When declaration form is likely required, add explicit Play Console declaration task.

### 4.6 UGC, social safety, and abuse controls

If app has UGC/social/chat:
- no report flow -> P1
- no block flow for direct user interaction -> P1
- no moderation workflow signals -> P1
- risky incidental sexual-content handling with no safeguards -> P1

### 4.7 Families and child-directed constraints

If children are targeted or likely:
- ad/SDK behavior incompatible with child-directed constraints -> P0/P1
- precise location or ad ID style collection patterns for child-only audience -> P0
- missing age-screen gating for mixed audience + non-child-approved SDKs -> P1

### 4.8 Metadata and misrepresentation risks

Flag:
- keywords/ranking/price claims or misleading text assets in listing resources -> P1
- claims in app text/store assets that do not match implemented features -> P1

### 4.9 Functionality and release quality

Flag:
- crashes, blank states, dead links, major missing core functions -> P0/P1
- placeholder/beta/demo text in release UX -> P1

### 4.10 2025/2026 reminders

Always verify and remind:
- current target API deadlines and extension windows -> P1 if at risk
- Android 16 shift to granular health permissions for body sensor access -> P1
- new personal developer account production access testing requirement
  (12 testers for 14 days closed testing) -> manual readiness blocker

---

## Step 5 - Output format

Return all sections at once.

### Section 1 - Executive summary

Include:
- inferred app purpose
- issue totals by severity
- top 3 rejection blockers
- top 3 fast wins
- strict-mode note

### Section 2 - Risk register

Use table, omit clean rows.

```text
| Priority | Area | Finding | Evidence | Fix | Effort | Confidence |
|----------|------|---------|----------|-----|--------|------------|
| P0 | Payments | Digital feature sold via external checkout | app/src/... | Move purchase to Play Billing | M | High |
```

Confidence values: High / Medium / Low.
Use "Assumption - verify manually" when evidence is incomplete.

### Section 3 - Detailed findings

Group by area. For each finding:
- what was found
- why it can fail review or trigger enforcement
- exact fix

Vibe coder mode:
- explain plainly
- include copy-paste prompt:
  `Tell Claude Code: "[exact file and change instruction]"`

Technical mode:
- reference concrete files/functions
- include implementation-oriented fix guidance

### Section 4 - Play review simulation checklist

Mark each line: PASS / RISK / FAIL / UNKNOWN

Checklist:
- App installs and launches without crash
- Core feature path works without dead ends
- Required permissions requested in context
- Privacy disclosures appear before sensitive collection
- Billing flows and subscription terms are clear
- Account deletion path is discoverable
- Report/block controls exist where needed
- No broken links in legal/support/contact paths

### Section 5 - Draft App Access / reviewer notes

Generate ready-to-paste notes for Play Console with:
- app purpose
- test credentials placeholders
- exact feature navigation steps
- permission usage explanations
- any sensitive declaration context reviewer should know

Use placeholders only for unknown credentials/secrets.

### Section 6 - Manual Play Console checklist

Always include:
- Data safety form accuracy
- Privacy policy URL live and complete
- Account deletion web link configured and tested
- Required declaration forms completed for sensitive permissions/APIs
- Target Audience and Content + Content Rating reviewed
- Billing/subscription settings and text verified
- targetSdk compliance confirmed for submission date
- closed testing/prod access requirement check (new personal accounts)
- App Access credentials added for reviewers if login required

### Section 7 - Ask 4 post-scan questions

Ask exactly these four:
1) Have you verified Data safety answers against all SDKs in this build?
2) Did you test account deletion end-to-end (in-app and web path)?
3) Have you completed all required permission/declaration forms in Play Console?
4) Is this your first Play submission from this developer account?

If answer to question 4 is yes, load `references/first-time-dev.md`.

---

## Closing line rules

If issues found:
- "Fix P0 first, then P1 declaration and metadata risks. Reply with 'fix [issue]' and I will generate exact edits."

If no code-level issues:
- "No code-level blockers detected. Complete the manual checklist and four questions before submission."

---

## Re-audit behavior

When user says a specific item is fixed:
- rescan only that area
- confirm pass/fail
- update only affected risk register rows
- state whether fix needs new build upload or only console metadata change

---

## Build Checklist mode (if user picked B)

Output:

```text
YOUR BUILD CHECKLIST
====================
[Current product state inferred from code]

FINISH THESE FIRST
[Missing flows, placeholders, stubs, broken core paths]

ALREADY SOLID
[Implemented parts that look production-ready]

WHEN READY
Say "audit my app" and I will run the strict Play submission audit.
```

Tone: constructive, no compliance scare language.
