import * as Sentry from "@sentry/tanstackstart-react";

function sendVital(name: string, value: number, unit: string) {
  if (import.meta.env.PROD) {
    Sentry.metrics.distribution(`web_vital.${name}`, value, { unit });
  }
}

export function reportWebVitals() {
  if (typeof window === "undefined") return;

  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) sendVital("lcp", Math.round(last.startTime), "millisecond");
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}

  try {
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const duration = Math.round((entry as any).processingStart - entry.startTime);
        sendVital("fid", duration, "millisecond");
      }
    });
    fidObserver.observe({ type: "first-input", buffered: true });
  } catch {}

  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      sendVital("cls", clsValue, "none");
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
  } catch {}

  try {
    const inpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        sendVital("inp", Math.round(entry.duration), "millisecond");
      }
    });
    inpObserver.observe({ type: "event", buffered: true });
  } catch {}

  try {
    const ttfbObserver = new PerformanceObserver((list) => {
      const nav = list.getEntries()[0] as PerformanceNavigationTiming | undefined;
      if (nav) sendVital("ttfb", Math.round(nav.responseStart - nav.requestStart), "millisecond");
    });
    ttfbObserver.observe({ type: "navigation", buffered: true });
  } catch {}
}
