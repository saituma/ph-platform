"use client";

import { io, type Socket } from "socket.io-client";
import { resolveSocketUrl } from "./socket-url";

let socketRef: Socket | null = null;

function getAccessTokenClient() {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("accessTokenClient="))
      ?.slice("accessTokenClient=".length) ?? ""
  );
}

export function getOrCreateAdminSocket(): Socket {
  if (socketRef) return socketRef;

  const socketUrl = resolveSocketUrl();
  const token = getAccessTokenClient();

  if (socketUrl && process.env.NODE_ENV !== "test") {
    void fetch(`${socketUrl}/health`, { cache: "no-store" }).catch(() => {});
  }

  socketRef = io(socketUrl, {
    auth: token ? { token } : undefined,
    transports: ["polling", "websocket"],
    reconnection: true,
    reconnectionAttempts: 12,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    withCredentials: true,
  });

  socketRef.on("disconnect", (reason) => {
    if (reason === "io server disconnect") {
      socketRef?.connect();
    }
  });

  return socketRef;
}

export function resetAdminSocketForTests() {
  socketRef?.disconnect();
  socketRef = null;
}
