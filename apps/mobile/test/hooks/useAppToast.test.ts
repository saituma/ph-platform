jest.mock("@/components/ui/toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    dismissAll: jest.fn(),
  }),
}));

import { renderHook } from "@testing-library/react-native";
import { useAppToast } from "@/hooks/useAppToast";

describe("useAppToast", () => {
  it("returns toast functions", () => {
    const { result } = renderHook(() => useAppToast());
    expect(result.current.show).toBeDefined();
    expect(result.current.success).toBeDefined();
    expect(result.current.error).toBeDefined();
    expect(result.current.warning).toBeDefined();
    expect(result.current.info).toBeDefined();
    expect(result.current.hide).toBeDefined();
  });
});
