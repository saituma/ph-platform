# ReplaceOnce Param Stringify Instability

## Severity
Low

## Risk
`ReplaceOnce` key derivation uses raw `JSON.stringify(params)`, which can vary with object key ordering.

## Evidence
- `apps/mobile/components/navigation/ReplaceOnce.tsx:8` uses `JSON.stringify(o.params)` in key generation.

## Impact
Equivalent params with different key order can produce different keys, causing unnecessary replace navigations.

## Recommendation
Use stable key serialization (sorted keys) for route param hashing.
