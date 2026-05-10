"use client";

import { io, type Socket } from "socket.io-client";
import { resolveSocketUrl } from "./socket-url";

let socketRef: Socket | null = null;

export function getOrCreateAdminSocket(): Socket {
  if (socketRef) return socketRef;

  const socketUrl = resolveSocketUrl();

  if (socketUrl && process.env.NODE_ENV !== "test") {
    void fetch(`${socketUrl}/health`, { cache: "no-store" }).catch(() => {});
  }

  socketRef = io(socketUrl, {
    // Fetch a fresh 60-second socket token via the backend proxy, which reads the
    // httpOnly accessToken cookie server-side. Never read accessTokenClient.
    auth: (callback: (data: Record<string, unknown>) => void) => {
      fetch("/api/backend/auth/socket-token", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { token?: string } | null) => callback(data?.token ? { token: data.token } : {}))
        .catch(() => callback({}));
    },
    transports: ["polling", "websocket"],
    reconnection: true,
    reconnectionAttempts: 12,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    withCredentials: true,
  });

  socketRef.on("connect", () => {
    console.info("[RealtimeLatency] web.socket.connect", {
      socketId: socketRef?.id ?? null,
      transport: socketRef?.io.engine.transport.name ?? "unknown",
    });
  });

  socketRef.on("connect_error", (error) => {
    console.warn("[RealtimeLatency] web.socket.connect_error", {
      message: error.message,
      transport: socketRef?.io.engine.transport.name ?? "unknown",
    });
  });

  socketRef.on("disconnect", (reason) => {
    console.info("[RealtimeLatency] web.socket.disconnect", {
      reason,
      transport: socketRef?.io.engine.transport.name ?? "unknown",
    });
    if (reason === "io server disconnect") {
      socketRef?.connect();
    }
  });

  socketRef.io.engine.on("upgrade", (transport) => {
    console.info("[RealtimeLatency] web.socket.transport_upgrade", {
      socketId: socketRef?.id ?? null,
      transport: transport.name,
    });
  });

  return socketRef;
}

export function resetAdminSocketForTests() {
  socketRef?.disconnect();
  socketRef = null;
}
