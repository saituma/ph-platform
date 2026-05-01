# Admin Team Chat Name-Collision Mapping

## Severity
Medium

## Risk
Team-to-chat mapping is based on normalized team name, which can collide.

## Evidence
- Team rows map chat by lowercased `displayName` key in `AdminGroupSection`.

## Impact
Two teams with same/similar names can resolve to wrong chat thread or overwrite association.

## Recommendation
Map by immutable team IDs (or explicit teamId metadata on groups), not display names.
