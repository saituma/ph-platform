import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

type Props = { children: ReactNode };

type State = { error: Error | null };

/**
 * Catches React render errors so a thrown exception does not leave a blank screen with no explanation.
 */
export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const depth =
      /maximum update depth/i.test(error.message) ||
      /maximum update depth/i.test(String((error as Error)?.stack ?? ""));
    console.error("[RootErrorBoundary]", error.message, info.componentStack);
    if (__DEV__ && depth) {
      console.warn(
        "[DEPTH-PROBE] ErrorBoundary saw max update depth — componentStack above is the best React hint for which tree failed.",
      );
    }
  }

  private clearError = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>{error.message}</Text>
          {__DEV__ ? (
            <Pressable onPress={this.clearError} style={styles.button}>
              <Text style={styles.buttonText}>Try again (dev)</Text>
            </Pressable>
          ) : (
            <Text style={styles.hint}>Close and reopen the app. If this persists, contact support.</Text>
          )}
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    color: "#333",
    marginBottom: 20,
    ...Platform.select({ web: { fontFamily: "system-ui" } }),
  },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#111",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  hint: {
    fontSize: 14,
    color: "#666",
  },
});
