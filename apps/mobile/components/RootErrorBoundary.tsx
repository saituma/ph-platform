import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Appearance, Platform, Pressable, StyleSheet, Text, View } from "react-native";

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

    // Report to Sentry in production
    try {
      // Dynamic require to avoid circular dependency with sentry init
      const { Sentry } = require("@/lib/sentry");
      Sentry.captureException(error, {
        contexts: { react: { componentStack: info.componentStack ?? undefined } },
      });
    } catch {
      // Sentry not available — nothing to do
    }
  }

  private clearError = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error) {
      const isDark = Appearance.getColorScheme() === "dark";
      return (
        <View style={[styles.container, isDark && styles.containerDark]}>
          <Text style={[styles.title, isDark && styles.titleDark]}>Something went wrong</Text>
          <Text style={[styles.body, isDark && styles.bodyDark]}>{error.message}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Try Again" onPress={this.clearError} style={[styles.button, isDark && styles.buttonDark]}>
            <Text style={[styles.buttonText, isDark && styles.buttonTextDark]}>Try Again</Text>
          </Pressable>
          {!__DEV__ && (
            <Text style={[styles.hint, isDark && styles.hintDark]}>If this keeps happening, close and reopen the app.</Text>
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
  containerDark: {
    backgroundColor: "#111",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
    color: "#000",
  },
  titleDark: {
    color: "#fff",
  },
  body: {
    fontSize: 15,
    color: "#333",
    marginBottom: 20,
    ...Platform.select({ web: { fontFamily: "system-ui" } }),
  },
  bodyDark: {
    color: "#ccc",
  },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#111",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonDark: {
    backgroundColor: "#fff",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  buttonTextDark: {
    color: "#111",
  },
  hint: {
    fontSize: 14,
    color: "#666",
  },
  hintDark: {
    color: "#999",
  },
});
