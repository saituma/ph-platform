import { useCallback, useRef, useState } from "react";
import { Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";

export type CurrentLocationPreviewState =
  | { status: "checking" }
  | { status: "permission-required" }
  | {
      status: "ready";
      coordinates: { latitude: number; longitude: number };
      areaLabel: string;
    }
  | { status: "denied"; canOpenSettings: boolean }
  | { status: "unavailable" };

const TEN_MINUTES_MS = 10 * 60 * 1000;

function coarseAreaLabel(address: Location.LocationGeocodedAddress | undefined): string | null {
  if (!address) return null;
  return address.district?.trim()
    || address.city?.trim()
    || address.region?.trim()
    || address.country?.trim()
    || null;
}

export function useCurrentLocationPreview(): {
  state: CurrentLocationPreviewState;
  requestPermission: () => Promise<void>;
  retry: () => Promise<void>;
  openSettings: () => Promise<void>;
} {
  const [state, setState] = useState<CurrentLocationPreviewState>({ status: "checking" });
  const generationRef = useRef(0);

  const publishPosition = useCallback(async (position: Location.LocationObject, generation: number) => {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      const areaLabel = coarseAreaLabel(addresses[0]);
      if (!areaLabel || generationRef.current !== generation) return false;
      setState({
        status: "ready",
        coordinates: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        areaLabel,
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const loadGrantedLocation = useCallback(async (generation: number) => {
    let hasUsableLocation = false;
    try {
      const cached = await Location.getLastKnownPositionAsync({ maxAge: TEN_MINUTES_MS });
      if (cached && generationRef.current === generation) {
        hasUsableLocation = await publishPosition(cached, generation);
      }
    } catch {
      // A cached lookup failure should not prevent the one-time fresh lookup.
    }

    if (generationRef.current !== generation) return;
    try {
      const fresh = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (generationRef.current !== generation) return;
      const publishedFresh = await publishPosition(fresh, generation);
      hasUsableLocation = publishedFresh || hasUsableLocation;
    } catch {
      // A cached result remains useful when a one-time refresh cannot complete.
    }

    if (!hasUsableLocation && generationRef.current === generation) {
      setState({ status: "unavailable" });
    }
  }, [publishPosition]);

  const checkPermission = useCallback(async () => {
    const generation = ++generationRef.current;
    setState({ status: "checking" });
    try {
      const permission = await Location.getForegroundPermissionsAsync();
      if (generationRef.current !== generation) return;
      if (permission.status === Location.PermissionStatus.GRANTED) {
        await loadGrantedLocation(generation);
      } else if (permission.canAskAgain) {
        setState({ status: "permission-required" });
      } else {
        setState({ status: "denied", canOpenSettings: true });
      }
    } catch {
      if (generationRef.current === generation) setState({ status: "unavailable" });
    }
  }, [loadGrantedLocation]);

  useFocusEffect(
    useCallback(() => {
      void checkPermission();
      return () => {
        generationRef.current += 1;
      };
    }, [checkPermission]),
  );

  const requestPermission = useCallback(async () => {
    const generation = ++generationRef.current;
    setState({ status: "checking" });
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (generationRef.current !== generation) return;
      if (permission.status === Location.PermissionStatus.GRANTED) {
        await loadGrantedLocation(generation);
      } else if (permission.canAskAgain) {
        setState({ status: "denied", canOpenSettings: false });
      } else {
        setState({ status: "denied", canOpenSettings: true });
      }
    } catch {
      if (generationRef.current === generation) setState({ status: "unavailable" });
    }
  }, [loadGrantedLocation]);

  const openSettings = useCallback(async () => {
    await Linking.openSettings().catch(() => undefined);
  }, []);

  return { state, requestPermission, retry: checkPermission, openSettings };
}
