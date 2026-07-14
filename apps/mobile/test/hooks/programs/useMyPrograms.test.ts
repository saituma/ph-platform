jest.mock("@/store/hooks", () => ({
  useAppSelector: jest.fn().mockReturnValue(null),
  useAppDispatch: jest.fn().mockReturnValue(jest.fn()),
}));
jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
}));
jest.mock("@/hooks/useActingUser", () => ({
  useActingUser: () => ({
    actingUserId: null,
    actingHeaders: undefined,
    effectiveProfileId: 1,
    effectiveProfileName: "Test",
    isStaff: false,
  }),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}), { virtual: true });
jest.mock("@/context/SocketContext", () => ({
  useSocket: () => ({ socket: null }),
}));

import React from "react";
import { renderHook } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import { useMyPrograms, useMySessionExercises } from "@/hooks/programs/useMyPrograms";

function wrapperWith(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

describe("useMyPrograms", () => {
  it("module exports exist", () => {
    const mod = require("@/hooks/programs/useMyPrograms");
    expect(mod).toBeDefined();
  });

  // The React Query cache is persisted to AsyncStorage. A restored entry from an older build
  // can rehydrate as a non-array, and React Query's `= []` default does NOT apply because the
  // data is not undefined. Screens iterate these lists directly, so a non-array took the whole
  // app down through the root error boundary.
  it("returns an array when the persisted cache rehydrates a non-array", () => {
    const client = makeClient();
    client.setQueryData(queryKeys.programs.myAssigned(), { programs: [{ id: 1 }] } as never);

    const { result } = renderHook(() => useMyPrograms("t0ken", true), {
      wrapper: wrapperWith(client),
    });

    expect(Array.isArray(result.current.programs)).toBe(true);
    expect(result.current.programs).toEqual([]);
  });
});

describe("useMySessionExercises", () => {
  it("returns an array when the persisted cache rehydrates a non-array", () => {
    const client = makeClient();
    client.setQueryData(queryKeys.programs.sessionExercises(0), { exercises: [] } as never);

    const { result } = renderHook(() => useMySessionExercises("t0ken"), {
      wrapper: wrapperWith(client),
    });

    // The crash was `for (const ex of exercises)` on this value.
    expect(Array.isArray(result.current.exercises)).toBe(true);
    expect(() => [...result.current.exercises]).not.toThrow();
  });
});
