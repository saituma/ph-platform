# Android OSM WebView CDN Dependency

## Severity
Medium

## Risk
Android map rendering depends on remote Leaflet/CARTO/Esri resources at runtime.

## Evidence
- `apps/mobile/components/tracking/OsmWebMapView.tsx:17-30` loads tiles and Leaflet from remote URLs.

## Impact
Map can degrade or fail under CDN blocking, restricted networks, or transient outages.

## Recommendation
Bundle critical map assets locally where possible and add a robust degraded-state/fallback UI.
