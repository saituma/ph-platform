# Privacy Settings 404 Fallback To Defaults

## Severity
Medium

## Risk
When privacy settings endpoint returns 404, client silently falls back to local defaults.

## Evidence
- `apps/mobile/services/tracking/socialService.ts:420-423` returns `DEFAULT_PRIVACY_SETTINGS` on 404.

## Impact
Infrastructure/proxy/API misrouting can look like valid user settings state, masking backend failures and causing unintended behavior.

## Recommendation
Surface a distinct degraded-state warning and require explicit user acknowledgement before treating fallback as authoritative.
