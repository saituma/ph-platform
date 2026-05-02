/**
 * Nitro server middleware: sets security response headers on every request.
 */
export default function securityHeaders(event: { node: { res: import("http").ServerResponse } }) {
  const res = event.node.res;

  // Content-Security-Policy — allow self, Google Fonts, Sentry, Cloudflare Turnstile, inline styles (Tailwind)
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' https://challenges.cloudflare.com https://*.sentry.io 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.sentry.io https://challenges.cloudflare.com wss: ws:",
      "frame-src https://challenges.cloudflare.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );

  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}
