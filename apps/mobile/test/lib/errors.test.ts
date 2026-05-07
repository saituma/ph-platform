import { parseApiError, isNetworkError, isAuthError } from "@/lib/errors";

describe("parseApiError", () => {
  it("parses status code errors", () => {
    const err = parseApiError(new Error("401 Unauthorized"));
    expect(err.code).toBe("unauthorized");
    expect(err.status).toBe(401);
    expect(err.message).toBe("Unauthorized");
  });

  it("parses 403 as forbidden", () => {
    expect(parseApiError(new Error("403 Forbidden")).code).toBe("forbidden");
  });

  it("parses 404 as not_found", () => {
    expect(parseApiError(new Error("404 Not Found")).code).toBe("not_found");
  });

  it("parses 500+ as server_error", () => {
    expect(parseApiError(new Error("500 Internal Server Error")).code).toBe("server_error");
    expect(parseApiError(new Error("502 Bad Gateway")).code).toBe("server_error");
  });

  it("detects network errors", () => {
    expect(parseApiError(new Error("Cannot reach API")).code).toBe("network");
    expect(parseApiError(new Error("Network request failed")).code).toBe("network");
    expect(parseApiError(new Error("Failed to fetch")).code).toBe("network");
  });

  it("detects timeout errors", () => {
    expect(parseApiError(new Error("Request timed out")).code).toBe("timeout");
  });

  it("handles non-Error inputs", () => {
    expect(parseApiError("string error").code).toBe("unknown");
    expect(parseApiError(null).code).toBe("unknown");
    expect(parseApiError(undefined).code).toBe("unknown");
  });
});

describe("isNetworkError", () => {
  it("returns true for network and timeout", () => {
    expect(isNetworkError({ code: "network", message: "" })).toBe(true);
    expect(isNetworkError({ code: "timeout", message: "" })).toBe(true);
  });

  it("returns false for other codes", () => {
    expect(isNetworkError({ code: "unauthorized", message: "" })).toBe(false);
  });
});

describe("isAuthError", () => {
  it("returns true for unauthorized and forbidden", () => {
    expect(isAuthError({ code: "unauthorized", message: "" })).toBe(true);
    expect(isAuthError({ code: "forbidden", message: "" })).toBe(true);
  });

  it("returns false for other codes", () => {
    expect(isAuthError({ code: "network", message: "" })).toBe(false);
  });
});
