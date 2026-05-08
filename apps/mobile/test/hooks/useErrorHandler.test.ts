jest.mock("@/lib/auth/session", () => ({
  clearCredentials: jest.fn(),
}));

import { renderHook, act } from "@testing-library/react-native";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { clearCredentials } from "@/lib/auth/session";

describe("useErrorHandler", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls onError callback", () => {
    const onError = jest.fn();
    const { result } = renderHook(() => useErrorHandler({ onError }));
    act(() => {
      result.current.handle(new Error("500 Server Error"));
    });
    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0][0].code).toBe("server_error");
  });

  it("clears credentials on auth error", () => {
    const { result } = renderHook(() => useErrorHandler());
    act(() => {
      result.current.handle(new Error("401 Unauthorized"));
    });
    expect(clearCredentials).toHaveBeenCalled();
  });

  it("calls onNetwork for network errors", () => {
    const onNetwork = jest.fn();
    const { result } = renderHook(() => useErrorHandler({ onNetwork }));
    act(() => {
      result.current.handle(new Error("Network request failed"));
    });
    expect(onNetwork).toHaveBeenCalled();
  });
});
