import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Appearance, AppState, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  children: ReactNode;
  message?: string;
};

type State = { error: Error | null };

const isMissingNavContextError = (error: unknown): error is Error => {
  if (!(error instanceof Error)) return false;
  const msg = String(error.message ?? "");
  return (
    msg.includes("Couldn't find a navigation context") ||
    msg.includes("Couldn't find a navigation object")
  );
};

/**
 * Recovers from transient "Couldn't find a navigation context" errors.
 * These can happen when returning from native pickers (camera/library) where
 * React trees are briefly re-mounted and context propagation can be inconsistent.
 */
export class NavigationRecoveryBoundary extends Component<Props, State> {
  state: State = { error: null };

  private appStateSub: { remove: () => void } | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;
  private retryScheduled = false;

  static getDerivedStateFromError(error: Error): State {
    if (isMissingNavContextError(error)) {
      return { error };
    }
    // Let non-navigation errors bubble to the parent boundary.
    throw error;
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (!isMissingNavContextError(error)) return;
    console.warn(
      "[NavigationRecoveryBoundary]",
      error.message,
      info.componentStack,
      error.stack,
    );
  }

  componentDidUpdate(): void {
    if (!this.state.error) {
      this.retryScheduled = false;
      return;
    }
    if (this.retryScheduled) return;
    if (this.retryCount >= 6) return;

    this.retryScheduled = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      this.retryCount += 1;
      this.retryScheduled = false;
      this.setState({ error: null });
    }, 120);
  }

  componentDidMount(): void {
    this.appStateSub = AppState.addEventListener("change", (next) => {
      if (next !== "active") return;
      // Let the navigation container settle for a tick before retrying render.
      if (this.retryTimer) clearTimeout(this.retryTimer);
      this.retryTimer = setTimeout(() => {
        this.retryCount = 0;
        this.retryScheduled = false;
        this.setState({ error: null });
      }, 60);
    });
  }

  componentWillUnmount(): void {
    this.appStateSub?.remove?.();
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  render(): ReactNode {
    if (this.state.error) {
      const isDark = Appearance.getColorScheme() === "dark";
      return (
        <View style={[styles.container, isDark && styles.containerDark]}>
          <Text style={[styles.title, isDark && styles.titleDark]}>Resuming…</Text>
          <Text style={[styles.body, isDark && styles.bodyDark]}>
            {this.props.message ??
              "Returning from camera/upload. Please wait a moment."}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry"
            onPress={() => {
              this.retryCount = 0;
              this.retryScheduled = false;
              this.setState({ error: null });
            }}
            style={[styles.button, isDark && styles.buttonDark]}
          >
            <Text style={[styles.buttonText, isDark && styles.buttonTextDark]}>Retry</Text>
          </Pressable>
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
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    color: "#000",
  },
  titleDark: {
    color: "#fff",
  },
  body: {
    fontSize: 14,
    color: "#555",
  },
  bodyDark: {
    color: "#aaa",
  },
  button: {
    marginTop: 16,
    alignSelf: "flex-start",
    backgroundColor: "#111",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
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
});
