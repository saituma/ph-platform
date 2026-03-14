let insert: jest.Mock;
let values: jest.Mock;
let onConflictDoNothing: jest.Mock;

jest.mock("../../src/db", () => {
  onConflictDoNothing = jest.fn();
  values = jest.fn(() => ({ onConflictDoNothing }));
  insert = jest.fn(() => ({ values }));
  return {
    db: { insert },
  };
});

import { addGroupMembers } from "../../src/services/chat.service";

describe("chat service", () => {
  beforeEach(() => {
    onConflictDoNothing.mockReset();
    values.mockClear();
    insert.mockClear();
  });

  test("addGroupMembers avoids duplicates via onConflictDoNothing", async () => {
    await addGroupMembers(1, [2, 2, 3]);
    expect(insert).toHaveBeenCalled();
    expect(values).toHaveBeenCalled();
    expect(onConflictDoNothing).toHaveBeenCalled();
  });
});
