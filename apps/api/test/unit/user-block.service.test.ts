type InsertQuery = {
  values: jest.Mock;
  onConflictDoNothing: jest.Mock;
};

type SelectQuery = PromiseLike<unknown[]> & {
  from: jest.Mock;
  where: jest.Mock;
  limit: jest.Mock;
};

let mockInsertQuery!: InsertQuery;
let mockSelectQuery!: SelectQuery;
let mockInsert!: jest.Mock;
let mockSelect!: jest.Mock;
let mockSelectedRows: unknown[] = [];

jest.mock("../../src/db", () => {
  mockInsertQuery = {
    values: jest.fn(() => mockInsertQuery),
    onConflictDoNothing: jest.fn(async () => undefined),
  };
  mockSelectQuery = {
    from: jest.fn(() => mockSelectQuery),
    where: jest.fn(() => mockSelectQuery),
    limit: jest.fn(async () => mockSelectedRows),
    then: (resolve, reject) => Promise.resolve(mockSelectedRows).then(resolve, reject),
  };
  mockInsert = jest.fn(() => mockInsertQuery);
  mockSelect = jest.fn(() => mockSelectQuery);
  return {
    db: {
      insert: mockInsert,
      select: mockSelect,
    },
  };
});

import {
  blockUserPair,
  filterBlockedRecipientsForSender,
  hasUserBlockBetween,
} from "../../src/services/user-block.service";

describe("user block service", () => {
  beforeEach(() => {
    mockSelectedRows = [];
    mockInsert.mockClear();
    mockSelect.mockClear();
    mockInsertQuery.values.mockClear();
    mockInsertQuery.onConflictDoNothing.mockClear();
    mockSelectQuery.from.mockClear();
    mockSelectQuery.where.mockClear();
    mockSelectQuery.limit.mockClear();
  });

  it("persists a block relation idempotently", async () => {
    await blockUserPair({ blockerId: 10, blockedId: 20 });

    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsertQuery.values).toHaveBeenCalledWith({ blockerId: 10, blockedId: 20 });
    expect(mockInsertQuery.onConflictDoNothing).toHaveBeenCalledTimes(1);
  });

  it("detects a block relation in either direction", async () => {
    mockSelectedRows = [{ id: 1 }];

    await expect(hasUserBlockBetween(10, 20)).resolves.toBe(true);
    expect(mockSelectQuery.limit).toHaveBeenCalledWith(1);
  });

  it("filters recipients who blocked the sender or were blocked by the sender", async () => {
    mockSelectedRows = [
      { blockerId: 2, blockedId: 1 },
      { blockerId: 1, blockedId: 3 },
    ];

    await expect(filterBlockedRecipientsForSender(1, [1, 2, 3, 4])).resolves.toEqual([1, 4]);
  });
});
