function normalizeBase(raw: string): string {
  return raw.trim().replace(/\/api\/?$/, "").replace(/\/+$/, "");
}

function isDeprecatedHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "ph-performance-2cae29f7922d.herokuapp.com";
  } catch {
    return false;
  }
}

export function resolveSocketUrl(): string {
  if (typeof window === "undefined") return "";

  const socketEnvUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "";
  const apiEnvUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const localDevHost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const fallbackLocalUrl = `${window.location.protocol}//${window.location.hostname}:3001`;

  const preferred = socketEnvUrl
    ? normalizeBase(socketEnvUrl)
    : apiEnvUrl
      ? normalizeBase(apiEnvUrl)
      : "";

  if (preferred && !isDeprecatedHost(preferred)) {
    return preferred;
  }

  if (!localDevHost) {
    return window.location.origin;
  }

  return fallbackLocalUrl;
}

