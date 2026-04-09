# Policy Refresh Playbook (Google Play)

Use this playbook whenever policy requirements change.

Goal: keep `SKILL.md` aligned with current Google Play enforcement without bloating false positives.

---

## Refresh cadence

- Monthly light refresh: check official update feeds and deadline pages.
- Quarterly deep refresh: re-validate all high-risk policy sections and declaration flows.
- Emergency refresh: run immediately when Google announces deadline or policy-enforcement changes.

---

## Source priority (highest first)

1. Google Play Developer Policy Center and Help Center policy pages
2. Play Console policy status and declaration guidance pages
3. Android Developers documentation tied to policy deadlines (target API, permissions)

Avoid using third-party blog posts as primary truth.

---

## Refresh workflow

1. Collect updates
- Check policy center update pages and affected policy docs.
- Record changed dates, thresholds, new declarations, and renamed permissions/APIs.

2. Classify impact
- Severity logic impact (P0/P1/P2)
- Detection logic impact (new files/patterns)
- Output checklist impact (new manual console tasks)
- First-time developer flow impact

3. Patch skill artifacts
- Update `SKILL.md` sections: checks, deadlines, and manual checklist.
- Update `references/android-patterns.md` for new implementation guidance.
- Update `references/data-safety-mapping.md` if data taxonomy shifts.
- Update `references/first-time-dev.md` if onboarding/release gates changed.
- Update `README.md` "what's new" and policy scope text.

4. Regression review
- Ensure no contradiction between sections.
- Re-check false-positive guardrails after every strictness addition.
- Keep strict mode evidence-based and avoid assumptions without labels.

5. Version stamp
- Add a dated note in changelog section of README.
- Include policy pages reviewed and effective dates.

---

## High-priority pages to re-check each cycle

- Developer Policy Center landing and recent updates
- User Data policy
- Permissions/APIs sensitive information policy
- Payments and Subscriptions policies
- Data safety form guidance
- Target API level requirements and policy summary page
- Account deletion requirement guidance
- Families policy (if child-directed support exists)
- UGC policy (if social/ugc apps are in scope)

---

## Change log template

Use this in README:

```text
## Policy Refresh - YYYY-MM-DD
- Sources reviewed: [list key URLs]
- Major changes: [deadlines/declarations/policy shifts]
- Skill updates:
  - [SKILL.md section]
  - [references file]
- Risk model impact: [P0/P1/P2 changes]
```

---

## Quality bar before releasing refresh

- No outdated dates in target API/deadline text
- New declaration requirements mapped to concrete audit checks
- Manual checklist includes every console-only blocker
- Mid-build and first-time flows still work
- Output format unchanged unless intentional
