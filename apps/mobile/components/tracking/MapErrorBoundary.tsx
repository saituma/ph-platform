import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Text, View } from "react-native";

type MapErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type MapErrorBoundaryState = {
  hasError: boolean;
};

/**
 * Catches render/errors from the map subtree so a native map/WebView failure
 * does not take down the whole screen.
 */
export class MapErrorBoundary extends Component<
  MapErrorBoundaryProps,
  MapErrorBoundaryState
> {
  state: MapErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn("MapErrorBoundary:", error.message, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              backgroundColor: "#1a1a1a",
            }}
          >
            <Text style={{ color: "#e5e5e5", fontSize: 15, textAlign: "center" }}>
              Map could not be displayed. You can still continue your run; try
              again or restart the app if this persists.
            </Text>
          </View>
        )
      );
    }
    return this.props.children;
  }
}
