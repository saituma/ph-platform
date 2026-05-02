import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { Sentry } from "@/lib/sentry";

/**
 * Manual Sentry verification screen. Navigate here in any build to fire each
 * error kind and confirm it lands in your Sentry dashboard.
 *
 *   - Open via the route /sentry-test (deep link: phperformance://sentry-test)
 *   - Or import-and-link from your dev menu / debug build
 *
 * Each button corresponds to a different code path Sentry handles.
 */
export default function SentryTestScreen() {
  const [log, setLog] = useState<string[]>([]);
  const append = (s: string) =>
    setLog((prev) => [`${new Date().toLocaleTimeString()}  ${s}`, ...prev].slice(0, 30));

  const tests: { label: string; run: () => void; note: string }[] = [
    {
      label: "1. Send a captureMessage (smoke test)",
      note: "Lightest possible — confirms DSN + network are reaching Sentry.",
      run: () => {
        const id = Sentry.captureMessage("sentry-test: hello from PH Performance", "info");
        append(`captureMessage → eventId ${id ?? "(none)"}`);
      },
    },
    {
      label: "2. captureException with a real Error",
      note: "Captures a thrown-but-handled error. Has a real stack trace.",
      run: () => {
        try {
          throw new Error("sentry-test: handled error with stack");
        } catch (e) {
          const id = Sentry.captureException(e);
          append(`captureException → eventId ${id ?? "(none)"}`);
        }
      },
    },
    {
      label: "3. Throw an unhandled error in a render path",
      note: "Real React render crash — caught by Sentry.wrap() boundary.",
      run: () => {
        append("Throwing unhandled error in 100ms ...");
        setTimeout(() => {
          throw new Error("sentry-test: UNHANDLED render-tick error");
        }, 100);
      },
    },
    {
      label: "4. Unhandled Promise rejection",
      note: "Async path Sentry hooks via the global rejection handler.",
      run: () => {
        append("Rejecting a promise without .catch ...");
        // Intentionally not awaited / not caught.
        void Promise.reject(new Error("sentry-test: unhandled promise rejection"));
      },
    },
    {
      label: "5. nativeCrash() — full process abort",
      note: "Forces a native crash. App will close. Reopen to see the report.",
      run: () => {
        append("Calling Sentry.nativeCrash() — app will close ...");
        setTimeout(() => Sentry.nativeCrash(), 200);
      },
    },
    {
      label: "Add a breadcrumb",
      note: "Breadcrumbs attach to the next captured event. Doesn't send by itself.",
      run: () => {
        Sentry.addBreadcrumb({
          category: "manual-test",
          message: "user pressed breadcrumb button",
          level: "info",
          data: { ts: Date.now() },
        });
        append("Breadcrumb added (will appear with the next event).");
      },
    },
    {
      label: "Set user + tag",
      note: "Attaches identifying info to all subsequent events.",
      run: () => {
        Sentry.setUser({ id: "test-user-1", email: "info@clientreach.ai" });
        Sentry.setTag("test-suite", "manual");
        append("User + tag set.");
      },
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Sentry verification</Text>
      <Text style={styles.subtitle}>
        Run a test, then check sentry.io → Issues. Most events show up within a few seconds.
      </Text>

      {tests.map((t, i) => (
        <View key={i} style={styles.row}>
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={t.run}
          >
            <Text style={styles.buttonText}>{t.label}</Text>
          </Pressable>
          <Text style={styles.note}>{t.note}</Text>
        </View>
      ))}

      <Text style={styles.logTitle}>Log</Text>
      <View style={styles.logBox}>
        {log.length === 0 ? (
          <Text style={styles.logEmpty}>No actions yet.</Text>
        ) : (
          log.map((line, i) => (
            <Text key={i} style={styles.logLine}>
              {line}
            </Text>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60, backgroundColor: "#0a0a0b", minHeight: "100%" },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: "#888", fontSize: 13, marginBottom: 20 },
  row: { marginBottom: 14 },
  button: {
    backgroundColor: "#1A7848",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  note: { color: "#888", fontSize: 12, marginTop: 6 },
  logTitle: { color: "#fff", fontWeight: "600", marginTop: 24, marginBottom: 8 },
  logBox: {
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
  },
  logEmpty: { color: "#555", fontStyle: "italic" },
  logLine: { color: "#9eb", fontSize: 12, fontFamily: "Courier", marginBottom: 4 },
});
