# Play Store Submission Auditor - AI Skill

An AI skill that scans Android app projects for Google Play submission and enforcement risks before release.

Built for production apps and strict pre-launch audits.

## What this skill does

- Scans your project code directly (Flutter, React Native, native Android)
- Detects vibe coder vs developer mode automatically
- Runs in strict mode by default (high-safety posture)
- Detects mid-build state and offers a build checklist mode
- Produces a full audit with:
  1. Executive summary
  2. Risk register (priority, evidence, fix, effort, confidence)
  3. Detailed findings with exact fixes
  4. Play review simulation checklist
  5. Draft App Access / reviewer notes
  6. Manual Play Console checklist
  7. Four post-scan readiness questions

## Key policy areas covered

- Target API level readiness and deadlines
- Data safety consistency and privacy disclosures
- Restricted and sensitive permissions declaration requirements
- Payments and subscriptions compliance
- Account deletion requirements (in-app + web)
- Metadata and misrepresentation risks
- UGC and social moderation expectations
- Families and child-directed constraints
- Functionality and release-quality blockers

## Install

```bash
npx skills add https://github.com/sifenfisaha/play-store-submission-auditor
```

## Use

Try prompts like:

- "Audit my app for Play Store submission"
- "Check if my Android app is ready to ship"
- "Why did Google Play reject this build?"

## Skill structure

```text
play-store-submission-auditor/
├── SKILL.md
├── config.json
└── references/
    ├── android-patterns.md
    ├── data-safety-mapping.md
    ├── first-time-dev.md
    └── policy-refresh-playbook.md
```

## Policy refresh playbook

This skill includes a built-in maintenance guide at:

- `references/policy-refresh-playbook.md`

Use it to keep the auditor aligned with Google Play policy changes over time.

## Inspiration

Inspired by the App Store skill:
https://github.com/itsncki-design/app-store-submission-auditor
