jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
}));

import type { QueuedMutation } from "@/lib/api/mutationQueue";

describe("mutationQueue", () => {
  it("module exports exist", () => {
    const mod = require("@/lib/api/mutationQueue");
    expect(mod).toBeDefined();
  });
});
