# Data Safety Mapping Reference

Use this file to map code/SDK evidence to likely Data safety declarations.

Important: this mapping is a detection aid, not legal advice.

---

## Data type signal examples

- Location APIs/permissions -> Approximate or Precise location
- Auth profile fields -> Name / Email / User IDs / Phone
- Billing history endpoints -> Purchase history / financial info
- Chat/message modules -> Other in-app messages
- Media upload modules -> Photos / Videos / Audio
- Crash SDKs -> Crash logs / Diagnostics
- Analytics SDKs -> App interactions / Device or other IDs
- Contacts provider access -> Contacts
- Calendar provider access -> Calendar events

---

## Purpose signal examples

- Feature operation -> App functionality
- metrics/tracing/analytics SDK -> Analytics
- push campaigns / CRM -> Developer communications
- ads/attribution SDK -> Advertising or marketing
- risk scoring / abuse detection -> Fraud prevention, security, and compliance
- feed recommendations -> Personalization
- login/profile/account workflows -> Account management

---

## Common mismatch patterns

- SDK present and active, but no matching declaration tasks in audit notes
- Sensitive data accessed before clear user-facing context/disclosure
- "Optional" language in policy text while code enforces mandatory collection
- Data deletion claims but no realistic deletion workflow in app/backend paths

---

## Confidence model for findings

- High: direct code evidence in current app path
- Medium: strong SDK/config indicators but runtime path not fully visible
- Low: inferred from naming/dependencies only

When confidence is Medium/Low and risk is high, label:
"Assumption - verify manually in Play Console and runtime testing."
