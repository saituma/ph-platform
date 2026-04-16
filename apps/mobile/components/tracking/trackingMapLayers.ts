import type { Region } from "react-native-maps";

/** Road / street basemap vs aerial imagery. */
export type TrackingMapStyle = "road" | "satellite";

export type LatLng = { latitude: number; longitude: number };

export type MarkerVisual =
  | {
      kind: "circle";
      color: string;
      borderColor?: string;
      borderWidth?: number;
      /** Radius-ish size (dp); diameter ≈ size × 2 */
      size: number;
    }
  | {
      kind: "flag";
      color: string;
      size: number;
    }
  | {
      kind: "label";
      color: string;
      backgroundColor: string;
      borderColor: string;
      text: string;
      fontSize?: number;
    };

export type TrackingMapLayer =
  | {
      id: string;
      type: "polyline";
      coordinates: LatLng[];
      strokeColor: string;
      strokeWidth: number;
    }
  | {
      id: string;
      type: "marker";
      coordinate: LatLng;
      title?: string;
      marker: MarkerVisual;
    };

/** iOS `MapView` and Android OSM `WebView` — both support `animateToRegion`. */
export type TrackingMapViewRef = {
  animateToRegion: (region: Region, duration?: number) => void;
};

export function regionToLeafletZoom(region: Region): number {
  const { latitudeDelta, longitudeDelta } = region;
  const delta = Math.max(
    0.0005,
    Math.min(latitudeDelta || 0.01, longitudeDelta || 0.01),
  );
  const z = Math.log2(360 / delta) - 1;
  return Math.max(3, Math.min(19, Math.round(z)));
}
