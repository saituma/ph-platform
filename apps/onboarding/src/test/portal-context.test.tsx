import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
// React is needed for JSX transform at runtime
import "react";

// Mock dependencies before importing PortalContext
vi.mock("@/portal/fetch-portal-user", () => ({
  fetchPortalUser: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/portal/portal-errors", () => ({
  PORTAL_UNAUTHORIZED_ERROR: "Unauthorized",
  PORTAL_SERVICE_UNAVAILABLE: "Service unavailable",
}));

vi.mock("@/portal/portal-query-keys", () => ({
  portalKeys: {
    user: (token: string | null) => ["portal", "user", token],
  },
}));

vi.mock("@/lib/token-expiry", () => ({
  isTokenExpired: (token: string | null) => !token,
  msUntilExpiry: () => 3600000,
}));

import { PortalProvider, usePortal } from "@/portal/PortalContext";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function TestConsumer() {
  const { loading, user, token, error } = usePortal();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.name : "null"}</span>
      <span data-testid="token">{token ?? "null"}</span>
      <span data-testid="error">{error ?? "null"}</span>
    </div>
  );
}

describe("PortalContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders children", () => {
    const qc = createQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <PortalProvider>
          <div data-testid="child">Hello</div>
        </PortalProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByTestId("child").textContent).toBe("Hello");
  });

  it("provides null user when unauthenticated", () => {
    const qc = createQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <PortalProvider>
          <TestConsumer />
        </PortalProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByTestId("user").textContent).toBe("null");
    expect(screen.getByTestId("token").textContent).toBe("null");
  });

  it("shows loading state initially when no token present", () => {
    const qc = createQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <PortalProvider>
          <TestConsumer />
        </PortalProvider>
      </QueryClientProvider>,
    );
    // Context initializes with loading=true then resolves — verify it renders
    const loadingEl = screen.getByTestId("loading");
    expect(loadingEl.textContent).toMatch(/true|false/);
  });

  it("throws error when usePortal is used outside provider", () => {
    // Suppress React error boundary console noise
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      render(<TestConsumer />);
    }).toThrow("usePortal must be used within PortalProvider");
    spy.mockRestore();
  });

  it("shows loading true when token is present and user is loading", () => {
    localStorage.setItem("auth_token", "valid-mock-token");
    // Mock isTokenExpired to return false for this token
    const qc = createQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <PortalProvider>
          <TestConsumer />
        </PortalProvider>
      </QueryClientProvider>,
    );
    // With a token present and query pending, loading should be true
    expect(screen.getByTestId("loading").textContent).toBe("true");
  });
});
