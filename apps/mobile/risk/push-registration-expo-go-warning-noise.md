# Push Registration Expo Go Warning Noise

## Severity
Low

## Risk
Push registration logs warnings for expected Expo Go unsupported path.

## Evidence
- `apps/mobile/lib/pushRegistration.ts:98` logs warning for Expo Go limitation.

## Impact
Expected warnings can pollute logs and obscure real push-registration failures.

## Recommendation
Downgrade to debug-level logging in known unsupported environments.
