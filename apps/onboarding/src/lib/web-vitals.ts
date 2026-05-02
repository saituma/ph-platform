export function reportWebVitals() {
  if (typeof window === "undefined") return;

  // LCP
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const last = entries[entries.length - 1];
    console.debug("[vitals] LCP:", Math.round(last.startTime), "ms");
  });
  lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });

  // FID / INP
  const fidObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.debug("[vitals] FID:", Math.round((entry as any).processingStart - entry.startTime), "ms");
    }
  });
  fidObserver.observe({ type: "first-input", buffered: true });

  // CLS
  let clsValue = 0;
  const clsObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value;
      }
    }
    console.debug("[vitals] CLS:", clsValue.toFixed(4));
  });
  clsObserver.observe({ type: "layout-shift", buffered: true });
}
